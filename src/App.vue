<script>

export default {
  name: "App",
  props: {
    debug: {
      type: Boolean,
      default: import.meta.env.DEV,
    },
    appName: {
      type: String,
      default: import.meta.env.VITE_APP_NAME || "Chatbot",
    },
  },
  data() {
    return {
      focused: false,
      prompt: "",
      prompts: [],
      selectedPromptIndex: null,
      loading: false,
      recording: false,
      transcription: '',
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
  methods: {
    stopListening() {
      if (this.recording) {
        this.stopRecording();
      }
    },
    async startRecording() {
      console.log("Starting recording...");
      this.recording = true;
      this.mediaRecorder = await this.createMediaRecorder();
      this.chunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        this.chunks.push(event.data);
      };
      this.mediaRecorder.start();
    },

    stopRecording() {
      console.log("Stopping recording...");
      this.recording = false;
      this.mediaRecorder.stop();
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        this.chunks = [];
        this.submitForm(blob);
      };
    },

    createMediaRecorder() {
      return new Promise(async (resolve, reject) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          resolve(mediaRecorder);
        } catch (err) {
          console.error("Error creating MediaRecorder:", err);
          reject(err);
        }
      });
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

    async submitForm(audioBlob = null) {
      this.loading = true;

      const formData = new FormData();
      formData.append("input", this.prompt);
      formData.append("history", JSON.stringify(this.prompts));
      if (audioBlob) {
        formData.append("audio", audioBlob);

        // Send the audio data to the /api/transcribe endpoint
        try {
          const audioData = await new Response(audioBlob).arrayBuffer();
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audioData,
            }),
          });

          if (!response.ok) {
            throw new Error('Error transcribing audio');
          }

          const data = await response.json();
          this.transcription = data.transcription;
        } catch (error) {
          console.error('Error:', error.message);
        }
      }

      fetch("/api", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((json) => {
          let result = json.text;
          let audioData = json.audioData;

          this.prompts.push({
            prompt: this.prompt,
            response: result,
          });
          this.prompt = "";
          this.loading = false;
          this.scrollToBottom();
          this.playAudio(audioData);
        });
    },
  },
};
</script>

<template>
  <div class="ui basic segment">
    <div :class="{ 'ui blurring page inverted content dimmer': true, active: recording }" @click="stopRecording" style="z-index: 9999000">
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
        background: #fff;
      "
    >
      <h1 class="ui center aligned page header">
        <span class="text">{{ appName }}</span>
      </h1>

      <form
        ref="form"
        @submit.prevent="submitForm"
        :class="{ loading }"
        class="ui huge form bottom"
      >
        <div class="field">
          <div class="ui right action left icon input">
            <i v-if="!recording" class="microphone icon link" @click="startRecording"></i>
            <i v-if="recording" class="stop icon link" @click="stopRecording"></i>
            <input
              type="text"
              ref="input"
              @keydown.enter.exact.stop.prevent="submitForm"
              @focus="focused = true"
              @blur="focused = false"
              v-model="prompt"
            />
            <!-- <resize-textarea
              ref="input"
              v-model="prompt"
              @keydown.prevent.enter="submitForm"
              @focus="focused = true"
              class="resize"
              :rows="1"
              :min-height="55"
              style="padding: 0.67857143em 1em"
            ></resize-textarea> -->
            <button type="submit" class="ui button primary">Go!</button>
          </div>
        </div>
      </form>
      <div class="transcription" style="margin-top: 1em;">
        <strong>Transcription:</strong> {{ transcription }}
      </div>
    </div>

    <div style="margin-top: 2em">
      <table
        v-if="prompts.length > 0"
        class="ui left aligned striped very relaxed table unstackable"
      >
        <template v-for="prompt in prompts">
          <tr class="prompt">
            <td class="collapsing">
              <em data-emoji=":thinking:" class="medium"></em>
            </td>
            <td>
              <p>
                <span v-html="prompt.prompt" class="ui large text"></span>
              </p>
            </td>
          </tr>
          <tr class="hover-parent response">
            <td class="collapsing top aligned">
              <em data-emoji=":dog:" class="medium"></em>
            </td>
            <td class="top aligned">
              <div>
                <p>
                  <span
                    v-html="prompt.response"
                    style="white-space: pre-line"
                    class="ui large text"
                  ></span>
                </p>
              </div>
            </td>
          </tr>
        </template>
      </table>

      <button
        v-if="prompts.length > 0"
        @click="clearPrompts"
        class="ui tertiary icon button"
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
</style>
