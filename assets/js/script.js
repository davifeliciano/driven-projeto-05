"use strict";

// Axios config
axios.defaults.baseURL = "https://mock-api.driven.com.br/api/v6/uol";

// Main elements
const loginScreen = document.querySelector("#login-screen");
const usernameInput = document.querySelector("#username");
const loginMessage = document.querySelector("#login-msg");
const messageSection = document.querySelector(".message-section");
const messageInput = document.querySelector("#message");

// Enum with visibility options
const visibility = Object.freeze({
  public: "message",
  private: "private_message",
});

/* Chat object stores the username, the selected recipient of the
   messages, the visibility of the messages and the messages queried
   from the API */
const chat = {
  username: undefined,
  sendTo: "Todos",
  visibility: visibility.public,
  messages: [],
};

function logError(error) {
  console.error(error);
}

function messageFilter(msg) {
  /* Function to filter out all the private messages not addressed
     to the current user */
  if (msg.type === "private-message") {
    if (msg.to !== chat.username || msg.from !== chat.username) {
      return false;
    }
  }
  return true;
}

function addMessageOnScreen(msg) {
  // Add a given message on the message section
  const messageContainer = document.createElement("div");
  messageContainer.classList.add("message");
  let senderRecipientSpan;

  switch (msg.type) {
    case "status":
      messageContainer.classList.add("status");
      senderRecipientSpan = `<span class="username">${msg.from}</span>:`;
      break;

    case "message":
      messageContainer.classList.add("public");
      senderRecipientSpan = `<span class="username">${msg.from}</span>
                             para <span class="username">${msg.to}</span>:`;
      break;

    case "private-message":
      messageContainer.classList.add("private");
      senderRecipientSpan = `<span class="username">${msg.from}</span> em privado
                             para <span class="username">${msg.to}</span>:`;
      break;

    default:
      break;
  }

  messageContainer.innerHTML = `<span class="timestamp">(${msg.time})</span>
                                ${senderRecipientSpan} <span>${msg.text}</span>`;

  messageSection.appendChild(messageContainer);
}

function updateMessages() {
  /* Get messages from the API, filter them and show them on the screen */
  return axios
    .get("messages")
    .then((response) => {
      const messages = response.data.filter(messageFilter);

      // Add messages to screen
      messageSection.innerHTML = "";
      for (const msg of messages) {
        addMessageOnScreen(msg);
      }

      /* If the last message of messages differs from
         the one of chat.messages, scroll last message into view */
      if (
        JSON.stringify(chat.messages.at(-1)) !== JSON.stringify(messages.at(-1))
      ) {
        document.querySelector(".message:last-child").scrollIntoView();
      }

      chat.messages = messages;
    })
    .catch(logError);
}

function sendMessage() {
  // Send the message in messageInput to the API
  const msg = messageInput.value.trim();
  if (msg === "") return null;
  messageInput.value = "";
  messageInput.focus();

  return axios
    .post("messages", {
      from: chat.username,
      to: chat.sendTo,
      text: msg,
      type: chat.visibility,
    })
    .then(updateMessages)
    .catch(window.location.reload);
}

function sendStatus() {
  /* Send the status to the API. If an error is thrown,
     refresh the page so that the user can login again */
  return axios
    .post("status", { name: chat.username })
    .catch(window.location.reload);
}

function showLoginMessage(msg) {
  loginMessage.classList.remove("hidden");
  loginMessage.innerText = msg;
}

function login() {
  const name = usernameInput.value.trim();

  if (name === "") {
    showLoginMessage("Insira um nome de usuário");
    return null;
  }

  messageInput.focus();
  return axios
    .post("participants", { name })
    .then((reponse) => {
      loginScreen.classList.add("hidden");
      chat.username = name;
      updateMessages();
      setInterval(updateMessages, 3000);
      setInterval(sendStatus, 5000);
    })
    .catch((error) => {
      if (error.response.status === 400) {
        showLoginMessage("Já existe um usuário com esse nome");
      }
    });
}

window.onload = () => {
  usernameInput.focus();
  usernameInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      login();
    }
  });

  messageInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  });
};
