const { ipcRenderer } = require('electron');
const jsonview = require('@pgrabovets/json-view');

/* ipcRenderer.on('node-data', (event, nodeInfo) => {
  // Assuming you have an element with id 'nodeInfoContainer' in your HTML
  const container = document.getElementById('nodeInfoContainer');
  if (container) {
    const tree = jsonview.create(nodeInfo);

    jsonview.render(tree, container);
    //jsonview.expand(tree);

    // Convert nodeInfo object to a string or format it as needed
    //container.innerText = JSON.stringify(nodeInfo, null, 2);
  }
});
 */
ipcRenderer.on('node-data', (event, nodeInfo) => {
  const container = document.getElementById('nodeInfoContainer');
  if (container) {
    container.innerHTML = formatJsonToHtml(nodeInfo);
  }
});


function formatJsonToHtml(jsonObject) {
  const createHtml = (obj, indent = 0, isToggleable = false) => {
      if (typeof obj !== 'object' || obj === null) {
          return `<span>${JSON.stringify(obj)}</span>`;
      }

      const isArray = Array.isArray(obj);
      const entries = isArray ? obj : Object.entries(obj);
      const tag = isArray ? 'ol' : 'ul';
      const style = isToggleable ? '' : `style="margin-left: ${indent * 20}px;"`;
      const className = isToggleable ? 'class="toggleable"' : '';

      return `<${tag} ${style} ${className}>
          ${entries.map(entry => {
              const [key, value] = isArray ? [null, entry] : entry;
              const formattedKey = key ? `<strong>${key}:</strong> ` : '';
              const isToggleSection = key === 'assets' || key === 'outputs';

              return `<li>${formattedKey}${isToggleSection ? createToggleSection(value, key) : createHtml(value, indent + 1)}</li>`;
          }).join('')}
      </${tag}>`;
  };

  const createToggleSection = (content, label) => {
      return `
          <details>
              <summary>${label}</summary>
              ${createHtml(content, 0, true)}
          </details>
      `;
  };

  return createHtml(jsonObject);
}

