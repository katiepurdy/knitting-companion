const { ipcRenderer, BrowserWindowProxy, ipcMain } = require('electron');

const defaultSection = document.getElementById('right-section-default');
const addPatternSection = document.getElementById('right-section-add-pattern');
const addPatternRepeatSection = document.getElementById('right-section-add-repeat');
const editPatternSection = document.getElementById('right-section-edit-pattern');

const addPatternForm = document.getElementById('add-pattern-form');
const editPatternForm = document.getElementById('edit-pattern-form');
const addRepeatForm = document.getElementById('add-repeat-form');

const repeatStepsError = document.getElementById('repeatStepsError');
const imageError = document.getElementById('imageError');
const nameError = document.getElementById('nameError');
const stepDetailsError = document.getElementById('stepDetailsError');
const stitchesError = document.getElementById('stitchesError');
const editNameError = document.getElementById('editNameError');
const editImageError = document.getElementById('editImageError');
const editStepDetailsError = document.getElementById('editStepDetailsError');
const editStitchesError = document.getElementById('editStitchesError');

const addAnotherStepButton = document.getElementById('add-another-step');
const editAddAnotherStepButton = document.getElementById('edit-add-another-step');

const previousStepButton = document.getElementById('previous');
const nextStepButton = document.getElementById('next');
const toggleRepeatButton = document.getElementById('repeat');

const cancelAddButton = document.getElementById('cancel-add-pattern');
const cancelEditButton = document.getElementById('cancel-edit-pattern');
const cancelAddRepeatButton = document.getElementById('cancel-repeat');
const saveAddPattern = document.getElementById('saveAddPattern');
const saveEditPattern = document.getElementById('saveEditPattern');
const saveRepeatButton = document.getElementById('save-repeat');

const patternSelect = document.getElementById('pattern-select');

const leftSection = document.getElementById('left-section');
const currentStepsSpan = document.getElementById('current-step');
const repeatSpan = document.getElementById('repeat-span');

let currentState = {
	patternImageName: 'default.png',
	patternId: 1,
	step: 1,
	totalSteps: 8,
	repeat: {
		active: true,
		position: 2,
		count: 0,
		steps: []
	}
}


addPatternForm.addEventListener('onsubmit', (e) => {
	e.preventDefault();
});

editPatternForm.addEventListener('onsubmit', (e) => {
	e.preventDefault();
});

addRepeatForm.addEventListener('onsubmit', (e) => {
	e.preventDefault();
});

// Save the selected steps to repeat
saveRepeatButton.addEventListener('click', (e) => {
	let stepsToRepeat = [];
	// Get the step numbers included in the repeat from the form
	const checkboxes = document.getElementsByClassName('repeat-checkbox');
	// Loop through the checkboxes
	checkboxes.forEach((checkbox) => {
		if (checkbox.checked) {
			// Push that step number to the array
			currentState.repeat.steps.push(checkbox.value);
		}
	});
	// If no steps were selected, display an error
	if (currentState.repeat.steps.length === 0) {
		repeatStepsError.textContent = 'You must select at least one step to repeat';
	}
});

// Request that the main process save the state to user preferences
let saveCurrentState = () => {
	ipcRenderer.send('save-current-state', currentState);
}

// Log the current state to the console during every click for development purposes
document.getElementById('body').addEventListener('click', () => {
	console.log(currentState);
})

// User selects a different pattern from the select box
patternSelect.addEventListener('change', (e) => {
	const patternId = e.target.options[e.target.selectedIndex].dataset.patternId
	ipcRenderer.send('change-pattern', patternId);
});

// Abandon the current repeat or create a new one
toggleRepeatButton.addEventListener('click', () => {
	if (currentState.repeat.active) {
		ipcRenderer.send('confirm-repeat-abandon', currentState.step);
	} else {
		// Display the add repeat form while hiding others
		defaultSection.style.display = 'none';
		addPatternSection.style.display = 'none';
		editPatternSection.style.display = 'none';
		addPatternRepeatSection.style.display = 'flex';
		// Populate the form with available steps

	}
});

// Add another fieldset to the add pattern form
addAnotherStepButton.addEventListener('click', () => {
	console.log('Add another step button clicked');
});

// Add another fieldset to the edit pattern form
editAddAnotherStepButton.addEventListener('click', () => {
	console.log('Edit add another step button clicked');
});

// Go to the previous step
previousStepButton.addEventListener('click', () => {
	currentState.totalSteps = document.getElementsByClassName('step').length;
	// Loop back to the last if on step 1
	if (currentState.step === 1) {
		currentState.step = currentState.totalSteps;
	} else if (currentState.step !== 1) {
		// Or just go to the current step minus 1
		currentState.step = currentState.step - 1;
	}
	visuallyChangeStep();
	saveCurrentState();
});

// Go to the next step
nextStepButton.addEventListener('click', () => {
	currentState.totalSteps = document.getElementsByClassName('step').length;
	// Loop back to step 1 if on the last step
	if (currentState.step === currentState.totalSteps) {
		currentState.step = 1;
	} else if (currentState.step < currentState.totalSteps) {
		// Or just go to the current step plus 1
		currentState.step = currentState.step + 1;
	}
	visuallyChangeStep();
	saveCurrentState();
});

const individualStepButtons = document.getElementsByClassName('step-button');

// Highlight and display the active step
let visuallyChangeStep = () => {
	for (let i = 0; i < individualStepButtons.length; i++) {
		// Remove active class from buttons
		individualStepButtons[i].classList.remove('active');
		// Add the active class to the newly active step button
		if (individualStepButtons[i].textContent == currentState.step) {
			individualStepButtons[i].classList.add('active');
		}
	}
	let steps = leftSection.children;
	for (let i = 0; i < steps.length; i++) {
		// Remove active class from steps
		steps[i].classList.remove('active');
		// Add the active class to the newly active step
		if (steps[i].dataset.stepId == currentState.step) {
			steps[i].classList.add('active');
			steps[i].scrollIntoView();
		}
	}
	// Update the current step text
	currentStepsSpan.textContent = currentState.step;
}

let populatePatternSelectOptions = (patterns) => {
	// Get all the patterns
	//patterns.forEach();
	
}

let populateWindow = (e, data) => {
	console.log(data);
	populatePatternSelectOptions(data.patterns);
}

ipcRenderer.on('populate-window', populateWindow);

let removeRepeat = () => {
	currentState.repeat = {
		active: false,
		position: 0,
		limit: 0
	}
	repeatSpan.innerHTML = '';
	saveCurrentState();
}

let isRepeatActive = (e) => {
	const targetStep = parseInt(e.target.innerText);
	// Jumping to a step erases the current repeat
	if (currentState.repeat.active) {
		// Get confirmation from user
		ipcRenderer.send('confirm-repeat-abandon', targetStep);
	} else {
		jumpToTargetStep(targetStep);
	}
}

// User has confirmed they want to abandon the current repeat
ipcRenderer.on('abandon-repeat', (e, targetStep) => {
	removeRepeat();
	if (targetStep !== 0) {
		jumpToTargetStep(targetStep);
	}
});

let jumpToTargetStep = (targetStep) => {
	// Jumping to a step erases the current repeat
	if (currentState.repeat.active) {
		// Get confirmation from user
		ipcRenderer.send('confirm-repeat-abandon');
	}
	currentState.step = targetStep;
	visuallyChangeStep();
	saveCurrentState();
}

// Add click events for jumping to steps
for (let i = 0; i < individualStepButtons.length; i++) {
	individualStepButtons[i].addEventListener('click', isRepeatActive);
}

// Add click events for image upload buttons
const imageUploadButton = document.getElementById('image-upload');
const editImageUploadButton = document.getElementById('edit-image-upload');
imageUploadButton.addEventListener('click', (e) => {
	ipcRenderer.send('imageUploadButtonClicked');
});
editImageUploadButton.addEventListener('click', (e) => {
	ipcRenderer.send('imageUploadButtonClicked');
});

let displayDefaultSection = () => {
	// Display the form while hiding others
	defaultSection.style.display = 'flex';
	addPatternSection.style.display = 'none';
	editPatternSection.style.display = 'none';
	addPatternRepeatSection.style.display = 'none'
}

cancelAddButton.addEventListener('click', displayDefaultSection);
cancelEditButton.addEventListener('click', displayDefaultSection);
cancelAddRepeatButton.addEventListener('click', displayDefaultSection);

ipcRenderer.on('selected-file', (e, data) => {
	const pathParagraph = document.getElementById('uploaded-image-path');
	pathParagraph.textContent = data;
});

ipcRenderer.on('display-add-pattern-form', (e, data) => {
	// Reset the form
	// Display the form while ensuring others are hidden
	defaultSection.style.display = 'none';
	addPatternSection.style.display = 'flex';
	editPatternSection.style.display = 'none';
	addPatternRepeatSection.style.display = 'none'
});

ipcRenderer.on('display-edit-pattern-form', (e, pattern) => {
	// Populate the form with data

	// Display the form while ensuring others are hidden
	defaultSection.style.display = 'none';
	addPatternSection.style.display = 'none';
	editPatternSection.style.display = 'flex';
	addPatternRepeatSection.style.display = 'none';
});

ipcRenderer.on('item:add', (e, items) => {
	items.forEach((item) => {
		// Build the new list item
		const wishlistItemLi = document.createElement('li');
		wishlistItemLi.classList.add('wishlist-item');
		wishlistItemLi.dataset.wineId = item.id;

		// Category
		const categoryDiv = document.createElement('div');
		categoryDiv.classList.add('category');
		const categoryP = document.createElement('p');
		categoryP.classList.add('category-name');
		const categoryText = document.createTextNode(item.category);

		// Include the category as a class name for color coding
		categoryDiv.classList.add(`${item.category.toLowerCase()}`);
		categoryP.appendChild(categoryText);
		categoryDiv.appendChild(categoryP);

		// Include a button to remove the item from the list
		const removeButton = document.createElement('button');
		removeButton.innerHTML = '&times;';
		removeButton.classList.add('remove-item');
		removeButton.addEventListener('click', removeItem);
		categoryDiv.appendChild(removeButton);

		// Item details
		const itemDetailsDiv = document.createElement('div');
		itemDetailsDiv.classList.add('item-details');
		const nameP = document.createElement('p');
		nameP.classList.add('name');
		const nameText = document.createTextNode(`Name: ${item.name}`);
		nameP.appendChild(nameText);
		const yearP = document.createElement('p');
		yearP.classList.add('year');
		const yearText = document.createTextNode(`Year: ${item.year}`);
		yearP.appendChild(yearText);
		const ratingDisplayP = document.createElement('p');
		const ratingStarsSpan = document.createElement('span');
		ratingStarsSpan.classList.add('rating-stars');
		ratingDisplayP.innerHTML = 'Rating: ';

		// Add star icons for the rating
		for (let i = 0; i < parseInt(item.rating); i++) {
			ratingStarsSpan.innerHTML += `<i class="fas fa-star"></i>`;
		}
		ratingDisplayP.appendChild(ratingStarsSpan);

		// Continue item details
		ratingDisplayP.classList.add('rating-display');
		const wineryP = document.createElement('p');
		const wineryText = document.createTextNode(`Winery: ${item.winery}`);
		wineryP.appendChild(wineryText);
		wineryP.classList.add('winery');
		const typeP = document.createElement('p');
		const typeText = document.createTextNode(`Type: ${item.type}`);
		typeP.appendChild(typeText);
		typeP.classList.add('type');
		const yearPurchasedP = document.createElement('p');
		const yearPurchasedText = document.createTextNode(`Year Puchased: ${item.yearPurchased}`);
		yearPurchasedP.classList.add('year-purchased')
		yearPurchasedP.appendChild(yearPurchasedText);

		const editButton = document.createElement('button');
		editButton.classList.add('button');
		editButton.classList.add('edit-button');
		editButton.addEventListener('click', editItem);
		editButton.textContent = 'Edit wine';

		// Put it all together
		itemDetailsDiv.appendChild(nameP);
		itemDetailsDiv.appendChild(yearP);
		itemDetailsDiv.appendChild(ratingDisplayP);
		itemDetailsDiv.appendChild(wineryP);
		itemDetailsDiv.appendChild(typeP);
		itemDetailsDiv.appendChild(yearPurchasedP);
		wishlistItemLi.appendChild(categoryDiv);
		wishlistItemLi.appendChild(itemDetailsDiv);
		wishlistItemLi.appendChild(editButton);
		
		// Append the newly built item to the list
		wishlist.appendChild(wishlistItemLi);
	});
});

// Bind event handlers to each item's buttons
document.querySelectorAll('.remove-item').forEach(item => {
  item.addEventListener('click', removeItem)
});

document.querySelectorAll('.edit-item').forEach(item => {
  item.addEventListener('click', editItem);
});
