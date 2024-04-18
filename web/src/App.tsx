import React from "react";

// @ts-ignore
declare const vscode: VSCode;
const sendMessage = () => {
  vscode.postMessage({
    type: "click",
    value: "hello from button"
  });
}

// @ts-ignore
window.addEventListener('message', event => {
  const message = event.data;
  console.log(`Received message: ${JSON.stringify(message)}`);
});

function App() {
  console.log("HELLO");
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-500 p-10">
      <textarea className="bg-white p-2 rounded-md w-full h-40" placeholder="FUCK something..."></textarea>
      <button className="bg-blue-500 text-white p-2 rounded-md mt-2" onClick={sendMessage}>OWO</button>
    </div>
  );
}

export default App;