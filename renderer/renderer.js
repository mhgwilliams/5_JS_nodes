
//const searchDirectoryBtn = document.getElementById("searchDirectoryBtn");
//const loadHouJsonBtn = document.getElementById("loadHouJson");

const saveNetworkBtn = document.getElementById("save_button");
const saveAsBtn = document.getElementById("saveAs_button");
const clearNetworkBtn = document.getElementById("clear_button");
const openSession = document.getElementById("open_button");

const clearDbBtn = document.getElementById("clear_DB_button");

const openConfigBtn = document.getElementById("toggleConfigBtn");

const loadAEbetaBtn = document.getElementById("loadAEbeta");


// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("openModalBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];


/* searchDirectoryBtn.addEventListener("click", () => {
  // Send a message to the main process to open the directory
  window.ipcRenderer.send("searchDirectory");
}); */

/* loadHouJsonBtn.addEventListener("click", () => {
  // Send a message to the main process to open the file
  window.ipcRenderer.send("loadHouJson");
}); */


saveNetworkBtn.addEventListener("click", () => {
  // Send a message to the main process to execute the save button
  console.log("save clicked");
  window.ipcRenderer.send("save-session");
});

loadAEbetaBtn.addEventListener("click", () => {
  window.ipcRenderer.send("load-AE");
});

saveAsBtn.addEventListener("click", () => {
  // Send a message to the main process to execute the save button
  console.log("save as clicked");
  window.ipcRenderer.send("save-session-as");
});

clearNetworkBtn.addEventListener("click", () => {
  // Send a message to the main process to execute the clear button
  console.log("clear network clicked");
  window.ipcRenderer.send("clear-network");
});

openSession.addEventListener("click", () => {
  // Send a message to the main process to execute the open button
  console.log("open session clicked");
  window.ipcRenderer.send("open-session");
});

clearDbBtn.addEventListener("click", () => {
  // Send a message to the main process to execute the clear db button
  console.log("clear database clicked");
  window.ipcRenderer.send("clear-database");
});

/* openConfigBtn.addEventListener("click", () => {
  // Send a message to the main process to execute the save button
  console.log("toggle config clicked");
  window.ipcRenderer.send("open-config");
}); */


// When the user clicks the button, open the modal 
btn.onclick = function() {
  modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

ipcRenderer.on('close-modal', () => {
  modal.style.display = "none";
});

ipcRenderer.on('newFile', (event, filePath) => {
    const fileConsoleList = document.getElementById("fileConsoleList");
    fileConsoleList.textContent = `${filePath} has been added to directory`;
});
