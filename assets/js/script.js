"use strict";

// Axios config
axios.defaults.baseURL = "https://mock-api.driven.com.br/api/v6/uol";

// Main elements
const loginScreen = document.querySelector("#login-screen");
const loadingScreen = document.querySelector("#loading-screen");
const usernameInput = document.querySelector("#username");
const loginMessage = document.querySelector("#login-msg");
const messageSection = document.querySelector(".message-section");
const messageInput = document.querySelector("#message");
const messageInputHint = document.querySelector("footer .recipient-hint");
const chatMenuBtn = document.querySelector(".chat-config-btn");
const chatMenuOverlay = document.querySelector(".chat-menu-overlay");
const contactSection = document.querySelector("#contacts");
const allContactsEntry = contactSection.querySelector("#all-contacts");
const visibilitySection = document.querySelector("#visibility");

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
  window.location.reload();
}

function messageFilter(msg) {
  /* Function to filter out all the private messages not addressed
     to the current user */
  if (msg.type !== visibility.private) return true;
  if (msg.to === chat.username || msg.from === chat.username) {
    return true;
  }
}

function addMessageOnScreen(msg) {
  // Add a given message on the message section
  const messageContainer = document.createElement("div");
  messageContainer.classList.add("message");
  messageContainer.dataset.test = "message";
  let senderRecipientSpan;

  switch (msg.type) {
    case "status":
      messageContainer.classList.add("status");
      senderRecipientSpan = `<span class="username">${msg.from}</span>:`;
      break;

    case visibility.public:
      messageContainer.classList.add("public");
      senderRecipientSpan = `<span class="username">${msg.from}</span>
                             para <span class="username">${msg.to}</span>:`;
      break;

    case visibility.private:
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
      const lastOldMessage = JSON.stringify(chat.messages.at(-1));
      const lastNewMessage = JSON.stringify(messages.at(-1));
      if (lastOldMessage !== lastNewMessage) {
        document.querySelector(".message:last-child").scrollIntoView();
      }

      chat.messages = messages;

      // Hide the loading screen when messages arrive
      hideLoadingScreen();
    })
    .catch(logError);
}

function updateMessageInputHint() {
  /* Updates the text below the message input with the selected
     contact and the selecter visibility config */
  messageInputHint.innerText = `Enviando para ${chat.sendTo}`;
  if (chat.visibility === visibility.private) {
    messageInputHint.innerText += " (reservadamente)";
  }
}

function selectContact() {
  // Function called when a contact of the mmenu is clicked
  const selectedContacts = contactSection.querySelectorAll(
    ".menu-entry.selected"
  );
  selectedContacts.forEach((elem) => elem.classList.remove("selected"));
  this.classList.add("selected");
  chat.sendTo = this.innerText;
  updateMessageInputHint();
}

function addContactOnMenu(contact, select = false) {
  /* Add a queried contact on the contacts section of the menu
     If selected === true, add it with selected class and update chat.sendTo */
  const contactDiv = document.createElement("div");
  contactDiv.classList.add("menu-entry");
  contactDiv.dataset.test = "participant";

  if (select === true) {
    contactDiv.classList.add("selected");
    chat.sendTo = contact.name;
  }

  contactDiv.innerHTML = `<ion-icon name="person"></ion-icon>
                              <span>${contact.name}</span>
                              <ion-icon name="checkmark" data-test="check"></ion-icon>`;

  contactDiv.addEventListener("click", selectContact);
  contactSection.appendChild(contactDiv);
}

function updateContacts() {
  // Query the online contacts and add them on the chat menu
  return axios
    .get("participants")
    .then((response) => {
      // Remove the old contacts from the menu
      const oldContacts = contactSection.querySelectorAll(
        ".menu-entry:not(#all-contacts)"
      );
      oldContacts.forEach((elem) => elem.remove());

      // Add the new
      const newContacts = response.data;
      newContacts
        .filter((contact) => contact.name !== chat.username)
        .forEach((contact) =>
          addContactOnMenu(
            contact,
            // Avoid the selection of a contact named "Todos"
            contact.name === chat.sendTo && contact.name !== "Todos"
          )
        );

      // If none of the contacts is selected, select #all-contacts
      if (contactSection.querySelector(".menu-entry.selected") === null) {
        allContactsEntry.classList.add("selected");
        chat.sendTo = allContactsEntry.innerText;
        updateMessageInputHint();
      }
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
    .catch(logError);
}

function sendStatus() {
  /* Send the status to the API. If an error is thrown,
     refresh the page so that the user can login again */
  return axios.post("status", { name: chat.username }).catch(logError);
}

function showLoginMessage(msg) {
  loginMessage.classList.remove("hidden");
  loginMessage.innerText = msg;
}

function showLoadingScreen() {
  loadingScreen.classList.remove("hidden");
}

function hideLoadingScreen() {
  loadingScreen.classList.add("hidden");
}

function login() {
  const name = usernameInput.value.trim();

  if (name === "") {
    showLoginMessage("Insira um nome de usuário");
    messageInput.focus();
    return null;
  }

  showLoadingScreen();
  messageInput.focus();
  return axios
    .post("participants", { name })
    .then(() => {
      loginScreen.classList.add("hidden");
      chat.username = name;

      // The call to updateMessages will hide the loading screen
      updateMessages();
      updateContacts();
      setInterval(updateMessages, 3000);
      setInterval(updateContacts, 3000);
      setInterval(sendStatus, 5000);
    })
    .catch((error) => {
      if (error.response.status === 400) {
        showLoginMessage("Já existe um usuário com esse nome");
        usernameInput.focus();
        hideLoadingScreen();
      }
    });
}

function showChatMenu() {
  chatMenuOverlay.classList.add("chat-menu-open");
}

function hideChatMenu() {
  chatMenuOverlay.classList.remove("chat-menu-open");
}

function setVisibility() {
  // Function to call when a visibility entry of the menu is clicked
  const selectedElem = visibilitySection.querySelector(".menu-entry.selected");
  if (selectedElem === this) {
    return;
  }

  selectedElem.classList.remove("selected");
  this.classList.add("selected");
  chat.visibility = visibility[this.dataset.visibility];
  updateMessageInputHint();
}

window.onload = () => {
  allContactsEntry.addEventListener("click", selectContact);
  visibilitySection.querySelectorAll(".menu-entry").forEach((elem) => {
    elem.addEventListener("click", setVisibility);
  });

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
