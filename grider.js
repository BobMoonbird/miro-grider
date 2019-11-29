// Settings for the preview
const previewSettings = {
    size: 20,
    margin: 4,
    elementsCount: 12
};

// Basic widget types we support, with predefined structure
const objectTypes = {
    'shape' : {
        type: 'shape',
        style: {
            shapeType: 3
        },
    },
    'sticker' : {
        type: 'sticker',
    }
}

// Prepare the icon
const icon = '<svg viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg">\n'
    + '    <g id="icon-24" stroke="currentColor" stroke-width="0.5" fill="none" fill-rule="evenodd">\n'
    + '        <rect x="4" y="4" width="6" height="6" />\n'
    + '        <rect x="14" y="4" width="6" height="6" />\n'
    + '        <rect x="4" y="14" width="6" height="6" />\n'
    + '        <rect x="14" y="14" width="6" height="6" />\n'
    + '    </g>\n'
    + '</svg>';

// Init shadow grid
const shadowGrid = initShadowGrid();

/**
 * Initialize the app
 */
miro.onReady(() => {
    registerListeners();
    refreshGridSelector();
    initDraggableContainer(document.querySelector('.grid-container'));
});

/**
 * Register listeners
 */
function registerListeners() {

    document.querySelector('.js-insert').addEventListener('click', createBtnClicked);

    document.querySelector('.js-advanced-toggle').addEventListener('click', toggleAdvancedVisibility);

    document.querySelectorAll('.js-widget-type').forEach(element => {
        element.addEventListener('click', toggleWidgetType);
    });

    let canvas = document.querySelector('.js-grid-preview');
    canvas.addEventListener('click', toggleRectSelected);
}

/**
 * Initializing the so-called shadow grid, that holds the current user selection
 *
 * @returns {[]}
 */
function initShadowGrid() {
    let grid = [];

    // We'll make all the grid items empty at the beginning
    for(let i = 0; i < previewSettings.elementsCount; i++) {
        grid.push([]);
        for(let j = 0; j < previewSettings.elementsCount; j++) {
            grid[i].push(false);
        }
    }

    return grid;
}

/**
 * Initialize the drag & drop functionality
 *
 * @param container
 */
function initDraggableContainer(container) {
    miro.board.ui.initDraggableItemsContainer(container, {

        draggableItemSelector: '.js-grid-preview',

        // We'll choose our icon as preview
        getDraggableItemPreview: () => {
            return {
                url: `data:image/svg+xml,${icon}`
            }
        },

        // When user drops the grid onto the screen, we'll create the grid at specified coordinates
        onDrop: async (canvasX, canvasY) => {
            await createGrid(
                canvasX,
                canvasY,
            );
        }
    });
}

/**
 * Opens / hides the advanced panel.
 * We don't use any libraries, therefore we need to create also simple stuff like this manually.
 */
function toggleAdvancedVisibility() {
    let section = document.querySelector('.js-advanced-section');
    let toggleButton = document.querySelector('.js-advanced-toggle');

    if (section.style.display == 'none') {
        section.style.display = 'block';
        toggleButton.classList.add('is-open');
    } else {
        section.style.display = 'none';
        toggleButton.classList.remove('is-open');
    }
}

/**
 * Toggles the widget type.
 * We want to have some visual feedback, therefore simple select element is not the way to go
 */
function toggleWidgetType(event) {
    document.querySelectorAll('.js-widget-type').forEach(element => element.classList.remove('is-selected'));
    event.currentTarget.classList.add('is-selected');
}

/**
 * Handles the clicks on the preview, stores the current configuration and updates the preview
 *
 * @param e
 */
function toggleRectSelected(e) {
    let rect = e.target.getBoundingClientRect();

    // Calculate the exact rectangle the user has clicked
    let clickedX = Math.floor((e.clientX - rect.left) / (previewSettings.size + previewSettings.margin));
    let clickedY = Math.floor((e.clientY - rect.top) / (previewSettings.size + previewSettings.margin));

    // If user is holding the shift key, we're toggling single items.
    // If not, we cover the whole area from the starting point.
    if (e.shiftKey) {
        shadowGrid[clickedX][clickedY] = !shadowGrid[clickedX][clickedY];
    } else {
        for(let y = 0; y < previewSettings.elementsCount; y++) {
            for (let x = 0; x < previewSettings.elementsCount; x++) {
                shadowGrid[x][y] = (x <= clickedX && y <= clickedY);
            }
        }
    }

    // Refresh the preview
    refreshGridSelector();
}

/**
 * Draws the preview onto the prepared canvas element
 */
function refreshGridSelector() {
    let canvas = document.querySelector('.js-grid-preview');
    let context = canvas.getContext('2d');

    // We'll always clear the canvas first, so we start with the clean slate
    context.clearRect(0, 0, canvas.width, canvas.height);

    for(let y = 0; y < previewSettings.elementsCount; y++) {
        for (let x = 0; x < previewSettings.elementsCount; x++) {

            if (shadowGrid[x][y] === false) {
                // Not selected rectangles are faintly colored
                context.strokeStyle = '#E1E0E7';
            } else {
                // The selected ones are darker
                context.strokeStyle = '#050038';
            }

            // Create the rectangles, one by one
            context.strokeRect(
                parseInt(previewSettings.margin + (x * previewSettings.size) + (x * previewSettings.margin)),
                parseInt(previewSettings.margin + (y * previewSettings.size) + (y * previewSettings.margin)),
                previewSettings.size,
                previewSettings.size
            );
        }
    }
}

/**
 * Creates the final grid at the specified point of the viewport
 *
 * @param baseX
 * @param baseY
 * @returns {Promise<void>}
 */
async function createGrid(baseX, baseY) {

    // Get the current advanced settings
    const widgetType = document.getElementsByClassName('js-widget-type is-selected')[0].dataset.value;
    const margin = document.querySelector('.js-margin').value;
    const itemSize = document.querySelector('.js-size').value;
    const contentType = document.querySelector('.js-content option:checked').value;

    // Prepare the widgets array
    let widgets = [];

    // Choose the correct object type
    let object = objectTypes[widgetType];

    // Prepare the values for the right widget type
    switch(widgetType) {
        case 'sticker':
            object.scale = itemSize / 200;
            break;
        case 'shape':
            object = Object.assign(object, {
                width: parseInt(itemSize),
                height: parseInt(itemSize)
            });
            break;
    }

    // Count the items, just in case
    let itemCount = 0;

    // Prepare the array of newly created widgets
    for(let y = 0; y < previewSettings.elementsCount; y++) {
        for(let x = 0; x < previewSettings.elementsCount; x++) {
            if (shadowGrid[x][y] == true) {
                itemCount++;
                widgets.push(
                    Object.assign(
                        {
                            x: parseInt(baseX + (x * itemSize) + (x * margin)),
                            y: parseInt(baseY + (y * itemSize) + (y * margin)),
                            text: prepareContent(contentType, itemCount)
                        },
                        object
                    )
                );
            }
        }
    }

    // Create the widgets in bulk
    let createdWidgets = await miro.board.widgets.create(widgets);

    // And select them all right after, so the user can manipulate them quickly
    await miro.board.selection.selectWidgets(createdWidgets);
}

/**
 * Prepares the correct textual content for the newly created widgets
 *
 * @param type
 * @param widgetNumber
 * @returns {string}
 */
function prepareContent(type, widgetNumber) {

    let content = '';

    switch(type) {
        case 'numbers':
            content = widgetNumber.toString();
            break;
    }

    return content;
}

/**
 * Handles the clicking of the button.
 * User doesn't want to drag and drop the items, we'll create the grid in the middle of the current viewport
 *
 * @returns {Promise<void>}
 */
async function createBtnClicked() {

    const viewport = await miro.board.viewport.getViewport();

    const baseX = viewport.x + (viewport.width / 2);
    const baseY = viewport.y + (viewport.height / 2);

    await createGrid(
        baseX,
        baseY,
    );
}
