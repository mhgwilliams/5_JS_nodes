const loadNukeFileBtn = document.getElementById('loadNukeFileBtn');
const loadNukeFileInput = document.getElementById('loadNukeFileInput');

loadNukeFileBtn.addEventListener('click', () => {
  // Send a message to the main process to execute the testPrint function
  window.ipcRenderer.send('loadNukeFile', +1);
  loadNukeFileInput.click();
});

loadNukeFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  console.log(file);
  console.log('success');
});