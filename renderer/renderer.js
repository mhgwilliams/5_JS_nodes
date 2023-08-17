const loadNukeFileBtn = document.getElementById("loadNukeFileBtn");
const loadNukeFileInput = document.getElementById("loadNukeFileInput");
const searchDirectoryBtn = document.getElementById("searchDirectoryBtn");
const loadHouJsonBtn = document.getElementById("loadHouJson");

const saveNetworkBtn = document.getElementById("save_button");
const loadNetworkBtn = document.getElementById("load_button");

const openConfigBtn = document.getElementById("toggleConfigBtn");

loadNukeFileBtn.addEventListener("click", () => {
  // Send a message to the main process to execute the nukefilebutton
  loadNukeFileInput.click();
});

loadNukeFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  window.ipcRenderer.send("loadNukeFile", file.path);
  console.log(file.path);
  console.log("success");
});

searchDirectoryBtn.addEventListener("click", () => {
  // Send a message to the main process to open the directory
  window.ipcRenderer.send("searchDirectory");
});

loadHouJsonBtn.addEventListener("click", () => {
  // Send a message to the main process to open the file
  window.ipcRenderer.send("loadHouJson");
});

saveNetworkBtn.addEventListener("click", () => {
  // Send a message to the main process to execute the save button
  console.log("save network clicked");
  window.ipcRenderer.send("save-network");
});

loadNetworkBtn.addEventListener("click", () => {
  // Send a message to the main process to execute the save button
  console.log("load network clicked");
  window.ipcRenderer.send("load-network");
});

openConfigBtn.addEventListener("click", () => {
  // Send a message to the main process to execute the save button
  console.log("toggle config clicked");
  window.ipcRenderer.send("open-config");
});