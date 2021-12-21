import readline from "readline";

export default function waitForEnter(
  message = "Press enter to exit"
): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(message, (ans: string) => {
      rl.close();
      resolve(ans);
    })
  );
}
