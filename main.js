const { app, dialog, BrowserWindow, Menu, ipcMain, ipcRenderer } = require('electron');
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

const userDataPath = app.getPath('userData');

// Define default user preferences
const settings = new Settings({
	configName: 'user-preferences',
	defaults: {
		windowBounds: { width: 803, height: 603 },
		patternImageName: path.join(userDataPath, 'default.png'),
		patternId: 1,
		step: 1,
		totalSteps: 8,
		repeat: {
			active: false,
			position: 0,
			count: 0,
			steps: []
		}
	}
});

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
			if (file.ext === 'png'|| file.ext === 'jpg'
			  || file.ext === 'jpeg' || file.ext === 'gif') {
				// Copy the selected file to the userData folder
				const destinationPath = path.resolve(userDataPath, file.name + file.ext);
				fs.copyFile(selectedPath, destinationPath, () => {
					// Let the user know the path to the file they selected
					e.sender.send('selected-file', selectedPath);
				});
			 } else {
				 // Display error to user
				 e.sender.send('selected-file', 'Invalid file extension (must be .png, .jpg, .jpeg, or .gif)');
			 }
			
		} else {
			e.sender.send('selected-file', 'Selected file: No file selected');
		}
 }).catch(err => console.log(err));
});

// Get the patterns from the database and send them to the main window
let readDB = () => {
	//let result = knex.select('*').from('patterns');
	// result.then((patterns) => { 
	// 	console.log(patterns);
	// 	//mainWindow.webContents.send('item:add', patterns);
	// });
	// knex('patterns')
  // .join('steps', 'patterns.pattern_id', '=', 'steps.pattern_id')
	// .select('*')
	
	// Get all the steps
	// let result = knex.join('steps', 'patterns.pattern_id', '=', 'steps.pattern_id')
	// .select('*').from('patterns')
	// result.then((data) => console.log('', data))
	// .catch((err) => console.log(err));

	// Get all the patterns
	let result = knex.select('*').from('patterns')
	result.then((data) => console.log('', data))
	.catch((err) => console.log(err));

	// let result = knex.select('*').from('patterns')
	// result.then((data) => {
	// 	console.log('', data);
	// 	mainWindow.webContents.send(data)
	// }).catch((err) => console.log(err));

	// If there are no patterns, display add pattern form
}

// Get all patterns from the database
ipcMain.on('get-all-patterns', () => {
	let result = knex.select('*').from('patterns')
	result.then((data) => {
		mainWindow.webContents.send(data)
	}).catch((err) => console.log(err));
});

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
			enableRemoteModule: true
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
	
	mainWindow.webContents.on('did-finish-load', () => {
		// Initiate manipulation of the DOM
		mainWindow.webContents.send('populate-window', 'go ahead');
	});

	mainWindow.on('closed', () => app.quit());
	
	// Preserve the state of the application in user preferences
	let saveCurrentState = (currentState) => {
		console.log('saving state', currentState);
		if (currentState.patternImageName) {
			settings.set('patternImageName', currentState.patternImageName);
		} else if (currentState.patternId) {
			settings.set('patternId', currentState.patternId);
		} else if (currentState.step) {
			settings.set('step', currentState.step);
		} else if (currentState.step) {
			settings.set('totalSteps', currentState.totalSteps);
		} else if (currentState.repeat) {
			settings.set('repeat', currentState.repeat);
		} else {
			console.log('Current state not saved.');
		}
	}

	// Handle request from the mainWindow to save its state
	ipcMain.on('save-current-state', (e, state) => {
		saveCurrentState(state);
	});

	// Add pattern
	ipcMain.on('add-pattern', (e, newPattern) => {
		knex('patterns')
			.insert(newPattern)
			.catch(err => console.log(err))
			.then(() => readDB());
	});

	ipcMain.on('edit-pattern', (e, updatedPattern) => {
		knex('patterns')
			.where({ 'pattern_id': id })
			.update(item)
			.catch(err => console.log(err))
			.then(() => readDB());
	});

	let menu = Menu.buildFromTemplate(mainMenuTemplate);
	Menu.setApplicationMenu(menu);
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

let getPatternData = () => {

}

ipcMain.on('changePattern', (newPatternId) => {
	// Get pattern data for this pattern ID
	// Update current pattern ID
	// Save current pattern ID as part of user preferences
	// Display pattern data to user
});

let displayAddNewPatternForm = () => {
	mainWindow.webContents.send('display-add-pattern-form');
}

let displayEditCurrentPatternForm = () => {
	// Get the data about the current pattern
	// const data = knex('patterns')
	// 	.where({ pattern_id: currentPatternId })
	// 	.catch(err => console.log(err));
	// 	// Build the pattern object
	// 	data.then((pattern) => {
	// 		const pattern = {
	// 			name: 'patternName',
	// 			image: 'imageName',
	// 			steps: [
	// 				{
	// 					number: 1,
	// 					details: 'a step detail',
	// 					stitches: 'some stitches'
	// 				},
	// 				{
	// 					number: 2,
	// 					details: 'another step detail',
	// 					stitches: 'some more stitches'
	// 				}
	// 			]
	// 		};
			// Display the data to the user
			mainWindow.webContents.send('display-edit-pattern-form', pattern);
		// });
	
		// let data = knex('patterns')
		// 	.where({ id: id })
		// 	.catch(err => console.log(err));
		// data.then((wines) => {
		// 	editWindow.webContents.on('did-finish-load', () => {
		// 		editWindow.webContents.send('editData', wines[0]);
		// 	});
		// });
}

let confirmCurrentPatternDelete = () => {
	dialog.showMessageBox({
		type: 'warning',
		buttons: ['No', 'Yes'],
		defaultId: 0,
		title: 'Delete current pattern',
		message: 'Are you sure you want to delete the current pattern?'
	}).then((dialog) => {
		if (dialog.response) {
			// Proceed with deletion of pattern
			// knex('patterns')
			// 	.where({ pattern_id: currentPatternId })
			// 	.del()
			// 	.catch(err => console.log(err));
			console.log('Deletion confirmed');
		}
	}).catch((err) => console.log(err));
}

let confirmRepeatAbandon = (e, stepToJumpTo) => {
	dialog.showMessageBox({
		type: 'warning',
		buttons: ['No', 'Yes'],
		defaultId: 0,
		title: 'Abandon current repeat',
		message: 'Are you sure you want to abandon the current repeat?'
	}).then((dialog) => {
		if (dialog.response) {
			mainWindow.webContents.send('abandon-repeat', stepToJumpTo);
			console.log(`Abandon repeat confirmed. Jump to ${stepToJumpTo}`);
		}
	}).catch((err) => console.log(err));
}

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
