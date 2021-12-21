

import waitForEnter from "./waitForEnter";
import inquirer from "inquirer";
import fetch from 'cross-fetch';
import path from "path";
import { existsSync, readFileSync, statSync, writeFileSync  } from "fs";
import { json2csvAsync, csv2jsonAsync } from 'json-2-csv';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const isLocal = typeof process.pkg === "undefined";
const basePath = isLocal ? process.cwd() : path.dirname(process.execPath);

(async ()=>{
  

  if (process.argv[2] == null) {
    console.log("Error!!!");
    console.log("Hey you need to drag and drop the reports CSV file from my.chili-publish.com");
    console.log("Just drag and drop the CSv file on top this exe");
    console.log("\n URL:");
    console.log("https://my.chili-publish.com/Reports/TotalRendersPerMonthPerCustomer");
    waitForEnter();
    return;
  }

  const csvFilePath = process.argv[2];

  console.log(csvFilePath);

  if (!existsSync(csvFilePath)) {
    
    console.log("Error!!!");
    console.log("Hey buddy, the file does not exist at this path");
    console.log(csvFilePath);
    waitForEnter();
    return;

  }
  else {
    const stat = statSync(csvFilePath);
    
    if (!stat.isFile()) {
      console.log("Error!!!");
      console.log("Hey friend, the file is not a file, but a folder");
      console.log(csvFilePath);
      waitForEnter();
      return;
    }
  }

  let csvString = null;

  try {
    csvString = readFileSync(csvFilePath, "utf-8");
  }
  catch(e){
    console.log("Error!!!");
    console.log("Something went wrong reading the file :(");
    console.log("\n" + e);
    waitForEnter();
    return;
  }

  if (csvString == null) {
    
    return
  }


  const rendersJson = await csv2jsonAsync(csvString) as Array<Record<string, string>>;

  const inputAnswers = await inquirer.prompt([
    {
      type: "input",
      message: "What is your myCP username",
      name: "username"
    },
    {
      type: "password",
      message: "What is your myCP password",
      name: "password"
    }
  ]);

  const authResp = await fetch("https://my.chili-publish.com/api/v1/Auth/login", {
    method: "POST",
    body: JSON.stringify(inputAnswers),
    headers:{
      "content-type": "application/json-patch+json"
    }
    
  });

  if (!authResp.ok) {
    console.log("Error!!!");
    console.log("Something whent very wrong talking with MyCP");
    console.log(authResp.status + " - " + authResp.statusText);
    waitForEnter();
    return;
  }

  const authObj = await authResp.json();

  if (authObj.token == null) {
    console.log("Error!!!");
    console.log("Something whent very wrong talking with MyCP");
    console.log(authObj);
    waitForEnter();
    return;
  }

  const token = authObj.token;

  const customerResp = await fetch("https://my.chili-publish.com/api/v1/internal/customers", {
    method: "GET",
    headers: {
      "Authorization":"Bearer " + token
    }
  })

  if (!customerResp.ok) {
    console.log("Error!!!");
    console.log("Something whent very wrong talking with MyCP");
    console.log(customerResp.status + " - " + customerResp.statusText);
    waitForEnter();
    return;
  }

  const customers = await customerResp.json() as Array<Record<string, string>>;
  
  for (const customerRenders of rendersJson) {
    const customer = customers.find(customer => customer["name"] == customerRenders["Customer"]);

    if (customer == null) {
      continue;
    }

    customerRenders["Division"] = customer["exactGuid"] as string;

  }

  const rendersUpdate = await json2csvAsync(rendersJson);

  try{
    const rendersExact = rendersUpdate.replace("Customer,Division", "Customer,ExactId")
    writeFileSync(basePath + "/rendersUpdated.csv", rendersExact);
  }
  catch (e) {
    console.log("Something went wrong writing 🙁")
    console.log(e);
  }

  console.log("File written to " + basePath + "/rendersUpdated.csv");

  waitForEnter();

})();

