// speechRecognition.js
export function isIOS() {
    return (
      ["iPad", "iPhone", "iPod"].indexOf(navigator.platform) >= 0 ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }
  
  export function createSpeechInput() {
    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("x-webkit-speech", "x-webkit-speech");
    input.style.opacity = 0;
    document.body.appendChild(input);
    return input;
  }
  
  export function setupSpeechInput(input, callback) {
    input.addEventListener("webkitspeechchange", (event) => {
      const recognizedText = event.target.value;
      callback(recognizedText);
    });
  }
  