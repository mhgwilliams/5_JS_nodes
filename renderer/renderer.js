
//const searchDirectoryBtn = document.getElementById("searchDirectoryBtn");
//const loadHouJsonBtn = document.getElementById("loadHouJson");

const saveNetworkBtn = document.getElementById("save_button");
const saveAsBtn = document.getElementById("saveAs_button");
const clearNetworkBtn = document.getElementById("clear_button");
const openSession = document.getElementById("open_button");

const clearDbBtn = document.getElementById("clear_DB_button");

const openConfigBtn = document.getElementById("toggleConfigBtn");

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
