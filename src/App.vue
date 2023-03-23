<script>
const speechRecognition = window.SpeechRecognition || webkitSpeechRecognition;

export default {
  name: "App",
  props: {
    debug: {
      type: Boolean,
      default: import.meta.env.DEV,
    },
    appName: {
      type: String,
      default: import.meta.env.VITE_APP_NAME || "Master Comms Mastermind",
    },
  },
  data() {
    return {
      focused: false,
      prompt: "",
      prompts: [],
      selectedPromptIndex: null,
      loading: false,
      listening: false,
      continuousListening: false,
      displayedResponse: '',
    };
  },
  mounted() {
    window
      .$(this.$refs.microphone)
      .transition("set looping")
      .transition("pulse", "1000ms");

    document.querySelector("title").innerHTML = this.appName;
  },
  computed: {
    selectedPrompt() {
      return this.prompts[this.selectedPromptIndex];
    },
  },
  watch: {
    prompt() {
      this.$nextTick(() => {
        this.autoResizeTextarea();
      });
    },
  },

  methods: {

    async showTextSlowly(text, index, delay = 50) {
        this.prompts[index].displayedResponse = "";
        for (let i = 0; i < text.length; i++) {
            this.prompts[index].displayedResponse += text.charAt(i);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    },


    stopListening() {
      this.listening = false;
      this.continuousListening = false; // Add this line to stop continuous listening
      this.recognition.stop();
    },

    listen() {
      if (this.listening) {
        this.stopListening();
        return;
      }
      const $this = this;
      $this.listening = true;
      $this.continuousListening = true;
      $this.recognition = new speechRecognition();
      $this.recognition.lang = $this.browserLanguage;
      $this.recognition.continuous = true; // Add this line to make it listen continuously

      $this.recognition.onstart = function () {
        console.log("Speech recognition started.");
      };

      $this.recognition.onresult = function (event) {
        const result = event.results[event.results.length - 1];
        let transcript = result[0].transcript;

        if ($this.prompt.trim() === "") {
          // Capitalize the first letter of the transcript
          transcript = transcript.charAt(0).toUpperCase() + transcript.slice(1);
        }

        if (result.isFinal) {
          if ($this.prompt.trim() !== "") {
            $this.prompt += ", "; // Add a comma if there was a pause and textarea is not empty
          }
          $this.prompt += transcript;
        } else {
          $this.prompt += " " + transcript;
        }
      };


      /* TRANSCRIBE WITHOUT COMMAS FOR PAUSES
      $this.recognition.onresult = function (event) {
        const transcript = event.results[event.results.length - 1][0].transcript;
        $this.prompt += " " + transcript; // Append the new transcript to the existing prompt
      };
      */

      $this.recognition.onerror = function (event) {
        console.log("Speech recognition error:", event.error);
      };

      $this.recognition.onend = function () {
        if ($this.continuousListening) {
          $this.recognition.start(); // Restart the recognition if it ended and continuousListening is still true
        } else {
          console.log("Speech recognition ended.");
        }
      };

      $this.recognition.start();
    },

    scrollToBottom() {
      this.$nextTick(() => {
        var promptElements = document.querySelectorAll(".prompt");
        if (promptElements.length > 0) {
          promptElements[promptElements.length - 1].scrollIntoView();
        }
      });
    },
    clearPrompts() {
      this.prompts = [];
    },
    playAudio(base64AudioData) {
      const audio = new Audio(`data:audio/mpeg;base64,${base64AudioData}`);
      audio.play();
    },

    autoResizeTextarea() {
      const textarea = this.$refs.input;
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    },

    submitForm() {
      this.loading = true;
      fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: this.prompt,
          history: this.prompts,
        }),
      })
        .then((response) => response.json())
        .then((json) => {
          let result = json.text;
          let audioData = json.audioData;


          // Push the prompt to the prompts array
          this.prompts.push({
            prompt: this.prompt,
            response: "", // Set an empty response initially
            displayedResponse: "", // Add this line to add an empty displayedResponse initially
          });


          /* Show text all at once
          this.prompts.push({
            prompt: this.prompt,
            response: result,
          });
          */

          this.prompt = "";
          this.loading = false;
          this.scrollToBottom();

          // Get the index of the latest prompt
          const latestPromptIndex = this.prompts.length - 1;

      
          this.showTextSlowly(result, latestPromptIndex).then(() => {
              this.$set(this.prompts[latestPromptIndex], "response", result);
          });


          this.playAudio(audioData);
        });
    },

  },
};
</script>

<template class="app-container">
  <div class="ui basic segment" style="background-color: #272727;">
    <div
      v-show="listening"
      class="ui active blurring page inverted content dimmer"
      @click="stopListening"
      style="z-index: 9999000"
    >
      <div class="content">
        <h2 class="ui inverted icon header">
          <i ref="microphone" class="icon microphone red"></i>
        </h2>
      </div>
    </div>
    <div
      style="
        position: sticky;
        top: 0px;
        z-index: 9999;
        padding-top: 2em;
        padding-bottom: 2em;
        background: ##272727;
      "
    >
      <h1 class="ui center aligned page header" style="color: white;">
        <span class="text">{{ appName }}</span>
      </h1>
  
      <h4 class="ui center aligned header" style="margin-top: 1em; margin-bottom: 2em; color: white;">Ray AI is your powerful personal mentor. For now, the focus is on communication in Leadership. Use the mic and speak naturally for best results.</h4> <!-- Add margin to the subtitle -->

      
      <form
        ref="form"
        @submit.prevent="submitForm"
        :class="{ loading }"
        class="ui huge form bottom"
      >
        <div class="field">
          <div class="ui right action left icon input">
            <i class="microphone icon link" @click="listen"></i>
            <textarea
              ref="input"
              @keydown.esc.stop.prevent="stopListening"
              @keydown.shift.space.exact.stop.prevent="listen"
              @keydown.enter.exact.stop.prevent="submitForm"
              @focus="focused = true"
              @blur="focused = false"
              v-model="prompt"
              rows="1"
              style="resize: none; padding: 0.67857143em 1em; padding-left: 2.5em;"
            ></textarea>
            <button type="submit" class="ui button primary">Go!</button>
          </div>
        </div>
      </form>

    </div>

    <div style="margin-top: 2em">
      <table
        v-if="prompts.length > 0"
        class="ui left aligned striped very relaxed table unstackable"
      >

      <template v-for="(prompt, index) in prompts">
        <tr class="prompt">
          <td class="collapsing">
            <em data-emoji=":speech_balloon:" class="medium"></em>
          </td>
          <td>
            <p>
              <span v-html="prompt.prompt" class="ui large text"></span>
            </p>
          </td>
        </tr>
        <tr class="hover-parent response">
          <td class="collapsing top aligned">
            <em data-emoji=":crown:" class="medium"></em>
          </td>
          <td class="top aligned">
            <div>
              <p>
                <span 
                  v-html="prompt.displayedResponse || prompt.response" 
                  style="white-space: pre-line" 
                  class="ui large text">
                </span>
              </p>
            </div>
          </td>
        </tr>
      </template>

      </table>

      <button
        v-if="prompts.length > 0"
        @click="clearPrompts"
        class="ui tertiary icon button start-over-button"
        >
        <i class="icon undo"></i>
        Start over
      </button>
    </div>
  </div>
</template>

<style scoped>
p {
  line-height: 3em;
}

.app-container {
  background-color: #272727;
  min-height: 100vh;
}

.start-over-button {
  color: lightgrey !important;
}

.start-over-button:hover {
  color: white !important;
}

a.hovering {
  visibility: hidden;
}

.hover-parent:hover a.hovering {
  visibility: visible;
}

textarea.resize {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.auto-resize-textarea {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  resize: none;
  overflow: hidden;
  padding-left: 150px; /* Add left padding */
}


</style>
