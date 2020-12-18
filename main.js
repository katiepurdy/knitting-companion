const { app, dialog, BrowserWindow, Menu, ipcMain } = require('electron');
const Settings = require('./settings.js');
const path = require('path');
const fs = require('fs');
const url = require('url');
const knex = require('knex')({
	client: 'sqlite3',
	connection: {
		filename: './src/knittingcompanion.db'
	},
	useNullAsDefault: true
});

// Get the path for user preferences and uploaded images
const userDataPath = app.getPath('userData');

// Define default user preferences
const settings = new Settings({
	configName: 'user-preferences',
	defaults: {
		windowBounds: { width: 803, height: 603 }
	}
});

let initialState = {
	patternImageName: '../assets/images/default.png',
	patternId: 1,
	step: 1,
	totalSteps: 0,
	repeat: {
		active: false,
		position: 1,
		count: 0,
		steps: []
	}
};

// Preserve the state of the application in user preferences
let saveCurrentState = (currentState) => {
	if (currentState.patternId) {
		settings.set('patternId', currentState.patternId);
	}
	if (currentState.patternImageName) {
		settings.set('patternImageName', currentState.patternImageName);
	}
	if (currentState.step) {
		settings.set('step', currentState.step);
	}
	if (currentState.step) {
		settings.set('totalSteps', currentState.totalSteps);
	}
	if (currentState.repeat) {
		settings.set('repeat', currentState.repeat);
	}
}

let getInitialStateFromUserPreferences = () => {
	if (initialState.patternId) {
		initialState.patternId = settings.get('patternId');
	}
	if (initialState.patternImageName) {
		initialState.patternImageName = settings.get('patternImageName');
	}
	if (initialState.step) {
		initialState.step = settings.get('step');
	}
	if (initialState.totalSteps) {
		initialState.totalSteps = settings.get('totalSteps');
	}
	if (initialState.repeat) {
		initialState.repeat = settings.get('repeat');
	}
}

// No pattern previously selected
if (settings.get('patternId') === undefined) {
	saveCurrentState(initialState);
} else {
	getInitialStateFromUserPreferences();
}

let mainWindow;

// Open a dialog window for selecting an image
ipcMain.on('imageUploadButtonClicked', (e) => {
	dialog.showOpenDialog({
		properties: ['openFile']
	}).then((data) => {
		// If the dialog wasn't cancelled
		if (data.filePaths.length > 0) {
			const selectedPath = data.filePaths[0];
			// Split the path into individual parts
			const file = path.parse(selectedPath);
			// Check for common image file extensions
			if (file.ext === '.png'|| file.ext === '.jpg'
			  || file.ext === '.jpeg' || file.ext === '.gif') {
				// Copy the selected file to the userData folder
				const destinationPath = path.resolve(userDataPath, file.name + file.ext);
				fs.copyFile(selectedPath, destinationPath, () => {
					// Let the user know the path to the file they selected
					e.sender.send('selected-file', selectedPath);
				});
			 } else {
				 // Display error to user
				 console.log('erroring');
				 e.sender.send('selected-file-error', 'Invalid file extension (must be .png, .jpg, .jpeg, or .gif)');
			 }
		} else {
			e.sender.send('selected-file', 'Selected file: No file selected');
		}
 }).catch(err => console.log(err));
});

// Open a dialog window for selecting an image
ipcMain.on('editImageUploadButtonClicked', (e) => {
	dialog.showOpenDialog({
		properties: ['openFile']
	}).then((data) => {
		// If the dialog wasn't cancelled
		if (data.filePaths.length > 0) {
			const selectedPath = data.filePaths[0];
			// Split the path into individual parts
			const file = path.parse(selectedPath);
			// Check for common image file extensions
			if (file.ext === '.png'|| file.ext === '.jpg'
			  || file.ext === '.jpeg' || file.ext === '.gif') {
				// Copy the selected file to the userData folder
				const destinationPath = path.resolve(userDataPath, file.name + file.ext);
				fs.copyFile(selectedPath, destinationPath, () => {
					// Let the user know the path to the file they selected
					e.sender.send('selected-file', selectedPath);
					// Save it to the database for the current pattern id
					let currentPatternId = settings.get('patternId');
					knex('patterns')
						.where({ 'id': currentPatternId })
						.update({ imagePath: selectedPath })
						.catch(err => console.log(err))
						.then((data) => refreshDisplayOfPatterns());
				});
			 } else {
				 // Display error to user
				 console.log('erroring');
				 e.sender.send('selected-file-error', 'Invalid file extension (must be .png, .jpg, .jpeg, or .gif)');
			 }
		} else {
			e.sender.send('selected-file', 'Selected file: No file selected');
		}
 }).catch(err => console.log(err));
});

// Log the contents of the database to the console
let readDB = () => {
	let result = knex.select('*').from('patterns');
		result.then((data) => {
			console.log(data);
		}).catch((err) => console.log(err));
}

// Main application window
let createWindow = () => {
	// Set initial window bounds based on user preferences
	let { width, height } = settings.get('windowBounds');
	
	// Create mainWindow
	mainWindow = new BrowserWindow({
	  width: width,
		height: height,
		minWidth: 600,
		minHeight: 800,
		icon: 'assets/images/yarn-icon.ico',
	  webPreferences: {
			nodeIntegration: true,
			webSecurity: false
		}
	});

	// Maximize the window unless a non-default window bounds preference has been set
	if (width === 803 && height === 603) {
		mainWindow.maximize();
	}

	// Save window bounds in user preferences when resized
	mainWindow.on('resize', () => {
    let { width, height } = mainWindow.getBounds();
    settings.set('windowBounds', { width, height });
  });

	// Load mainWindow contents
	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'src/index.html'),
		protocol: 'file',
		slashes: true
	}));

	// Request a specific pattern to display
	ipcMain.on('refresh-patterns', refreshDisplayOfPatterns)

	// Display all patterns once the DOM is loaded
	mainWindow.webContents.on('did-finish-load', refreshDisplayOfPatterns);

	// Quit the application
	mainWindow.on('closed', () => app.quit());

	// Handle request from the mainWindow to save its state
	ipcMain.on('save-current-state', (e, state) => {
		saveCurrentState(state);
	});

	// Save new pattern to the database
	ipcMain.on('save-new-pattern', (e, newPattern) => {
		knex('patterns')
			.insert(newPattern)
			.catch(err => console.log(err))
			.then((data) => refreshDisplayOfPatterns());
	});

	// Save edited pattern to the database
	ipcMain.on('save-edited-pattern', (e, editedPattern, id) => {
		knex('patterns')
			.where({ 'id': id })
			.update(editedPattern)
			.catch(err => console.log(err))
			.then((data) => refreshDisplayOfPatterns());
	});

	let menu = Menu.buildFromTemplate(mainMenuTemplate);
	Menu.setApplicationMenu(menu);
}

// Get and display all of the patterns if they exist in the database
let refreshDisplayOfPatterns = () => {
	// Get all patterns
	let result = knex.select('*').from('patterns');
	result.then((data) => {
		// If there are patterns in the database
		if (data.length > 0) {
			// Display them
			mainWindow.webContents.send('populate-window', data, initialState);
		} else {
			displayAddNewPatternForm();
		}
	}).catch((err) => console.log(err));
}

// Menu item has been selected to edit the current pattern
let displayEditCurrentPatternForm = () => {
	mainWindow.webContents.send('display-edit-pattern-form');
}

// Show a dialog box before deleting the current pattern
let confirmCurrentPatternDelete = () => {
	// If there is no current pattern, notify the user
	if (settings.get('patternId') === 1) {
		dialog.showMessageBox({
			type: 'warning',
			buttons: ['Okay'],
			defaultId: 0,
			title: 'Can not delete Sample Pattern',
			message: 'The initial Sample Pattern cannot be deleted.'
		}).then((dialog) => console.log('Dialog closed with "Okay"'))
		.catch((err) => console.log(err));
	} else {
		dialog.showMessageBox({
			type: 'warning',
			buttons: ['No', 'Yes'],
			defaultId: 0,
			title: 'Delete current pattern',
			message: 'Are you sure you want to delete the current pattern?'
		}).then((dialog) => {
			if (dialog.response) {
				// Proceed with deletion of pattern and associated steps
				let id = settings.get('patternId');
				knex('patterns')
					.where({ id: id })
					.del()
					.catch(err => console.log(err))
					.then((data) => {
						mainWindow.webContents.send('deletion-complete');
					});
			}
		}).catch((err) => console.log(err));
	}
}

// Set up menu items
const mainMenuTemplate = [
	{
		label: 'File',
		submenu: [
			{
				label: 'Add new pattern',
				click() { displayAddNewPatternForm() }
			},
			{
				label: 'Edit current pattern',
				click() { displayEditCurrentPatternForm() }
			},
			{
				label: 'Delete current pattern',
				click() { confirmCurrentPatternDelete() }
			},
			{
				label: 'Read DB',
				click() { readDB() }
			},
			{ type: 'separator' },
			{
				label: 'Quit',
				accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
				click() { app.quit() }
			},
		]
	},
	{
		label: 'Dev Tools',
		submenu: [
			{
				label: 'Toggle Dev Tools',
				accelerator: 'CmdorCtrl+J',
				click(item, focusedWindow) { focusedWindow.toggleDevTools() }
			},
			{
				role: 'reload'
			}
		]
	}
];

// Menu item has been selected to add a new pattern
let displayAddNewPatternForm = () => {
	mainWindow.webContents.send('display-add-pattern-form');
}

// Show a dialog box before abandoning the current repeat
let confirmRepeatAbandon = (e) => {
	dialog.showMessageBox({
		type: 'warning',
		buttons: ['No', 'Yes'],
		defaultId: 0,
		title: 'Abandon current repeat',
		message: 'Are you sure you want to abandon the current repeat?'
	}).then((dialog) => {
		if (dialog.response) {
			const stepToJumpTo = settings.get(repeat.position);
			mainWindow.webContents.send('abandon-repeat', stepToJumpTo);
			console.log(`Abandon repeat confirmed. Jump to ${stepToJumpTo}`);
		}
	}).catch((err) => console.log(err));
}

ipcMain.on('refresh-after-delete', refreshDisplayOfPatterns);

// Notify the user that they're about to abandon the current repeat
ipcMain.on('confirm-repeat-abandon', confirmRepeatAbandon);

// Create the main window
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Hide some ELectron warnings in the console of the renderer process
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
