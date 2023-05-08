const loadNukeFileBtn = document.getElementById("loadNukeFileBtn");
const loadNukeFileInput = document.getElementById("loadNukeFileInput");
const searchDirectoryBtn = document.getElementById("searchDirectoryBtn");
const loadHouJsonBtn = document.getElementById("loadHouJson");
const saveButton = document.getElementById("save_button");

saveButton.addEventListener("click", exportNetwork);

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