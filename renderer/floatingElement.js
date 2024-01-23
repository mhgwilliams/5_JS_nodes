// Make the element draggable
const element = document.getElementById("floatingElement");
const header = document.querySelector(".header");

let isDragging = false;
let offsetX, offsetY;

header.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    document.addEventListener("mousemove", onDragMouseMove);
    document.addEventListener("mouseup", onDragMouseUp);
    
    header.style.userSelect = "none";
    element.style.userSelect = "none";
});

function onDragMouseMove(e) {
    if (!isDragging) return;
    element.style.left = e.clientX - offsetX + 'px';
    element.style.top = e.clientY - offsetY + 'px';
}

function onDragMouseUp() {
    isDragging = false;
    document.removeEventListener("mousemove", onDragMouseMove);
    document.removeEventListener("mouseup", onDragMouseUp);

    header.style.userSelect = "";
    element.style.userSelect = "";
}

// Collapse functionality
const collapseButton = document.querySelector(".collapse-button");
const content = document.querySelector("#floatingElement .content");

collapseButton.textContent = '-'; 

collapseButton.addEventListener("click", () => {
    const isCollapsed = content.style.display === "none";
    element.style.height = isCollapsed ? "auto" : "30px";
    element.style.width = isCollapsed ? "auto" : "170px";
    content.style.display = isCollapsed ? "" : "none";
    collapseButton.textContent = isCollapsed ? '-' : '+';
});

// Make the element resizable
const resizeHandle = document.querySelector(".resize-handle");

let isResizing = false;
let startX, startY, startWidth, startHeight;

resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);
    document.addEventListener("mousemove", onResizeMouseMove);
    document.addEventListener("mouseup", onResizeMouseUp);
});

function onResizeMouseMove(e) {
    if (!isResizing) return;
    let width = startWidth + e.clientX - startX;
    let height = startHeight + e.clientY - startY;

    width = Math.max(width, 100);
    height = Math.max(height, 50);

    element.style.width = width + 'px';
    element.style.height = height + 'px';
}

function onResizeMouseUp() {
    isResizing = false;
    document.removeEventListener("mousemove", onResizeMouseMove);
    document.removeEventListener("mouseup", onResizeMouseUp);
}
