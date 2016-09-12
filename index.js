// TAB_SIZE = 4

// Utils
function isNullOrUndef(v) { return (v === null || v === undefined); }

// The actual app
var AudioContext = window.AudioContext || window.webkitAudioContext;

var drawMode = {
	lines: 0,
	fill: 1,
	outline: 2
};
var refreshables = {
	SETTINGS_BIT: 1,
	TABS_BIT: 2,
	PRESETLIST_BIT: 4
};

var exprArgs = [
	'rand',
	'max',
	'min',
	'cos',
	'sin',
	'tan',
	'acos',
	'asin',
	'atan',
	'pow',
	'pi',
	'maxval',
	'minval',
	'time',
	'duration'
];

function numberProperty(v) {
	if(!v) v = 0;
	
	if(typeof v === 'object' && v.hasOwnProperty('expr')) {
		v = v.expr;
	}
	
	var expr = v.toString();
	var gtr = new Function(exprArgs.join(','), 'return (' + expr + ')');
	
	var p = {};
	p.toJSON = function() {
		return expr;
	};
	
	Object.defineProperty(p, 'value', {
		get: function() {
			try {
				return gtr(
					Math.random,
					Math.max,
					Math.min,
					Math.cos,
					Math.sin,
					Math.tan,
					Math.acos,
					Math.asin,
					Math.atan,
					Math.pow,
					Math.PI,
					frameProps.maxval,
					frameProps.minval,
					frameProps.time,
					frameProps.duration);
			} catch(e) {
				return 0;
			}
		}
	});
	
	Object.defineProperty(p, 'expr', {
		get: function() {
			return expr;
		},
		
		set: function(val) {
			if(val === '') val = '0';
			
			expr = val;
			gtr = new Function(exprArgs.join(','), 'return (' + expr.toLowerCase() + ')');
		}
	});
	
	return p;
}

function Section(p) {
	p = p || {};
	
	this.name = !isNullOrUndef(p.name) ? p.name : 'A section';
	this.visible = !isNullOrUndef(p.visible) ? p.visible : true;
	this.minDecibels = numberProperty(!isNullOrUndef(p.minDecibels) ? p.minDecibels : -100);
	this.maxDecibels = numberProperty(!isNullOrUndef(p.maxDecibels) ? p.maxDecibels : -20);
	this.barCount = numberProperty(!isNullOrUndef(p.barCount) ? p.barCount : 32);
	this.freqStart = numberProperty(!isNullOrUndef(p.freqStart) ? p.freqStart : 0);
	this.freqEnd = numberProperty(!isNullOrUndef(p.freqEnd) ? p.freqEnd : 0.03);
	this.barsWidth = numberProperty(!isNullOrUndef(p.barsWidth) ? p.barsWidth : 6.0);
	this.barsStartX = numberProperty(!isNullOrUndef(p.barsStartX) ? p.barsStartX : -1);
	this.barsEndX = numberProperty(!isNullOrUndef(p.barsEndX) ? p.barsEndX : 1);
	this.barsY = numberProperty(!isNullOrUndef(p.barsY) ? p.barsY : -0.5);
	this.color = !isNullOrUndef(p.color) ? p.color : '#ffffff';
	this.barsPow = numberProperty(!isNullOrUndef(p.barsPow) ? p.barsPow : 2);
	this.barsHeight = numberProperty(!isNullOrUndef(p.barsHeight) ? p.barsHeight : 0.7);
	this.barsMinHeight = numberProperty(!isNullOrUndef(p.barsMinHeight) ? p.barsMinHeight : 0.01);
	this.glowness = numberProperty(!isNullOrUndef(p.glowness) ? p.glowness : 0.0);
	this.polar = numberProperty(!isNullOrUndef(p.polar) ? p.polar : 0.0);
	this.mode = !isNullOrUndef(p.mode) ? p.mode : drawMode.lines;
	this.clampShapeToZero = !isNullOrUndef(p.clampShapeToZero) ? p.clampShapeToZero : true;
	this.closeShape = !isNullOrUndef(p.closeShape) ? p.closeShape : true;
	this.drawLast = !isNullOrUndef(p.drawLast) ? p.drawLast : true;
	this.quadratic = !isNullOrUndef(p.quadratic) ? p.quadratic : true;
}

function Settings(p) {
	this.set(p);
}
Settings.prototype.addSection = function(p) {
	this.sections.push(new Section(p));
	
	return this;
};
Settings.prototype.set = function(p) {
	p = p || {};
	
	this.smoothingTimeConstant = numberProperty(!isNullOrUndef(p.smoothingTimeConstant) ? p.smoothingTimeConstant : 0.65);
	
	this.sections = [];
	if(Array.isArray(p.sections)) {
		for(var i = 0; i < p.sections.length; i++) {
			this.addSection(p.sections[i]);
		}
	}
	
	this.globalScale = numberProperty(!isNullOrUndef(p.globalScale) ? p.globalScale : 1.0);
	this.globalOffsetX = numberProperty(!isNullOrUndef(p.globalOffsetX) ? p.globalOffsetX : 0.0);
	this.globalOffsetY = numberProperty(!isNullOrUndef(p.globalOffsetY) ? p.globalOffsetY : 0.0);
	this.globalRotation = numberProperty(!isNullOrUndef(p.globalRotation) ? p.globalRotation : 0.0);
	
	this.imageURL = !isNullOrUndef(p.imageURL) ? p.imageURL : '';
	this.imageX = numberProperty(!isNullOrUndef(p.imageX) ? p.imageX : 0);
	this.imageY = numberProperty(!isNullOrUndef(p.imageY) ? p.imageY : 0);
	this.imageWidth = numberProperty(!isNullOrUndef(p.imageWidth) ? p.imageWidth : 0.4);
	this.imageHeight = numberProperty(!isNullOrUndef(p.imageHeight) ? p.imageHeight : 0.4);
	this.imageRot = numberProperty(!isNullOrUndef(p.imageRot) ? p.imageRot : 0);
	
	this.backgroundColor = !isNullOrUndef(p.backgroundColor) ? p.backgroundColor : '#3b3b3b';
};

var settingsPresets = {
	'Default': new Settings().addSection(),
	'DubstepGutter': new Settings(JSON.parse('{"smoothingTimeConstant":"0.5","sections":[{"name":"Bass top","visible":true,"minDecibels":"-70","maxDecibels":"-30","barCount":"128","freqStart":"-0.002","freqEnd":"0.02","barsWidth":"1","barsStartX":"-0.55","barsEndX":"0.1","barsY":"0.2","color":"#ffffff","barsPow":"5","barsHeight":"0.03","barsMinHeight":"0.005","glowness":"4","polar":"1","mode":0,"clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true},{"name":"Bass bottom","visible":true,"minDecibels":"-70","maxDecibels":"-30","barCount":"128","freqStart":"-0.002","freqEnd":"0.02","barsWidth":"1","barsStartX":"0.65","barsEndX":"0.1","barsY":"0.2","color":"#ffffff","barsPow":"5","barsHeight":"0.03","barsMinHeight":"0.005","glowness":"4","polar":"1","mode":0,"clampShapeToZero":true,"closeShape":true,"drawLast":false,"quadratic":true},{"name":"High top","visible":true,"minDecibels":"-70","maxDecibels":"-30","barCount":"128","freqStart":"0.015","freqEnd":"0.03","barsWidth":"1","barsStartX":"1.45","barsEndX":"1.05","barsY":"0.2","color":"#ffffff","barsPow":"3","barsHeight":"0.01","barsMinHeight":"0.005","glowness":"4","polar":"1","mode":0,"clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true},{"name":"High bottom","visible":true,"minDecibels":"-70","maxDecibels":"-30","barCount":"128","freqStart":"0.015","freqEnd":"0.03","barsWidth":"1","barsStartX":"0.65","barsEndX":"1.05","barsY":"0.2","color":"#ffffff","barsPow":"3","barsHeight":"0.01","barsMinHeight":"0.005","glowness":"4","polar":"1","mode":0,"clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true}],"globalScale":"max(max((maxval + 70) / 50, 0) * 3, 1)","globalOffsetX":"rand() * max((maxval + 70) / 50, 0) * 0.01 - 0.02","globalOffsetY":"rand() * max((maxval + 70) / 50, 0) * 0.01 - 0.02","globalRotation":"0","imageURL":"dsg.png","imageX":"0","imageY":"0","imageWidth":"0.405","imageHeight":"0.405","backgroundColor":"#3b3b3b"}')),
	'Rebellion': new Settings({
			smoothingTimeConstant: 0.5,
			imageX: 0,
			imageY: 0,
			imageWidth: 0.8,
			imageHeight: 0.8
		}).addSection({
			minDecibels: -54,
			maxDecibels: -25,
			barCount: 128,
			freqStart: 0.015,
			freqEnd: 0.030,
			barsWidth: 0.8,
			barsStartX: -0.5,
			barsEndX: 0.5,
			barsY: 0.4,
			color: "#bdc3c7",
			barsPow: 2,
			barsHeight: 0.25,
			barsMinHeight: 0.005,
			glowness: 0.0,
			
			polar: 1.0,
			mode: drawMode.outline,
			clampShapeToZero: false,
			closeShape: false
		}).addSection({
			minDecibels: -54,
			maxDecibels: -25,
			barCount: 128,
			freqStart: 0.015,
			freqEnd: 0.030,
			barsWidth: 0.8,
			barsStartX: 1.5,
			barsEndX: 0.5,
			barsY: 0.4,
			color: "#bdc3c7",
			barsPow: 2,
			barsHeight: 0.25,
			barsMinHeight: 0.005,
			glowness: 0.0,
			
			polar: 1.0,
			mode: drawMode.outline,
			clampShapeToZero: false,
			closeShape: false
		}).addSection({
			minDecibels: -48,
			maxDecibels: -20,
			barCount: 128,
			freqStart: 0,
			freqEnd: 0.015,
			barsWidth: 0.8,
			barsStartX: -0.5,
			barsEndX: 0.5,
			barsY: 0.4,
			color: "#ffffff",
			barsPow: 3,
			barsHeight: 0.25,
			barsMinHeight: 0.005,
			glowness: 0.0,
			
			polar: 1.0,
			mode: drawMode.fill,
			clampShapeToZero: false,
			closeShape: false
		}).addSection({
			minDecibels: -48,
			maxDecibels: -20,
			barCount: 128,
			freqStart: 0,
			freqEnd: 0.015,
			barsWidth: 0.8,
			barsStartX: 1.5,
			barsEndX: 0.5,
			barsY: 0.4,
			color: "#ffffff",
			barsPow: 3,
			barsHeight: 0.25,
			barsMinHeight: 0.005,
			glowness: 0.0,
			
			polar: 1.0,
			mode: drawMode.fill,
			clampShapeToZero: false,
			closeShape: false
		})
};

var settings = new Settings();
var hoverSection = null;

var frameProps = {
	maxval: 0,
	minval: Number.MIN_SAFE_INTEGER
};

function loadFilePreset(f, setIt) {
	if(!f) return;
	
	var fileName = f.name.substr(0, f.name.lastIndexOf('.'));
	var reader = new FileReader();
	reader.onload = function(e) {
		var newSets = new Settings(JSON.parse(e.target.result));
		
		var newPresetName = fileName;
		
		var counter = 0;
		while(settingsPresets[newPresetName] !== undefined) {
			newPresetName = fileName + ' (' + counter + ')';
			counter++;
		}
		
		settingsPresets[newPresetName] = newSets;
		
		if(setIt) loadPreset(newPresetName);
	};
	
	reader.readAsText(f);
}

var refreshControls = (function(){
	var glblSettings = null;
	var secTabs = null;
	var addTabLi = null;
	var sectionSettingsUl = null;
	var presetList = null;
	var presetNameIn = null;
	var loadPresetBtn = null;
	var savePresetBtn = null;
	
	var downloader = null;
	var fileChooser = null;
	
	var initialized = false;
	
	var sectionControls = [];
	
	var refreshTabs = function() {
		var thisIndex = -1;
		
		for(var i = 0; i < secTabs.children.length; i++) {
			if(secTabs.children[i].classList.contains("activated")) {
				thisIndex = i;
				continue;
			}
		}
		
		while(sectionSettingsUl.children.length !== 0) {
			sectionSettingsUl.removeChild(sectionSettingsUl.children[0]);
		}
		
		while(secTabs.children.length !== 0 && secTabs.children[0] !== addTabLi) {
			secTabs.removeChild(secTabs.children[0]);
		}
		
		for(var i = 0; i < settings.sections.length; i++) {
			actionAddTab(i);
		}
		
		if(thisIndex !== -1) {
			for(var i = 0; i < sectionControls[thisIndex].length; i++) {
				sectionSettingsUl.appendChild(sectionControls[thisIndex][i]);
			}
			
			secTabs.children[thisIndex].classList.add("activated");
		}
	};
	
	var createControl = function(s, x) {
		var p = s[x];
		
		if((typeof p === 'object' && !p.hasOwnProperty('expr')) || typeof p === 'function') {
			return null;
		}
		
		var li = $('<li>')[0];
		var span = $('<span>')[0];
		var input = $('<input>')[0];
		
		li.classList.add("settingsCtrl");
		span.classList.add("ctrlName");
		input.classList.add("ctrlInput");
		
		span.innerHTML = x;
		
		if(typeof p === 'boolean') {
			input.type = 'checkbox';
			
			input.checked = p;
		} else if(x.toLowerCase().endsWith('color')) { // Assume this is a color
			input.type = 'color';
			
			input.value = p.toString();
		} else {
			input.type = 'text';
			
			input.placeholder = p.hasOwnProperty('expr') ? 'expression' : (typeof p);
			
			var val = p.toString();
			if(val.startsWith('data:')) { // data url :p
				input.value = 'DataURL';
			} else {
				if(p.hasOwnProperty('expr'))
					input.value = p.expr;
				else
					input.value = p.toString();
			}
		}
		
		input.addEventListener('change', function(){
			if(typeof s[x] === 'number') {
				if(this.value === '') return;
				
				s[x] = this.value;
			} else if(typeof s[x] === 'boolean') {
				s[x] = this.checked;
			} else if(s[x].hasOwnProperty('expr')) {
				s[x].expr = this.value;
			} else {
				s[x] = this.value;
			}
		});
		
		li.appendChild(span);
		li.appendChild(input);
		
		if(typeof p === 'boolean') {
			var chkbx = $('<span>')[0];
			chkbx.classList.add("ctrlCheckbox", "fa");
			
			chkbx.addEventListener('click', function(e) {
				s[x] = input.checked = !input.checked;
			});
			
			li.appendChild(chkbx);
		}
		
		return li;
	}
	
	var createControlCombo = function(s, x, vals) {
		var p = s[x];
		
		if(typeof p === 'object' || typeof p === 'function') {
			return null;
		}
		
		var li = $('<li>')[0];
		var span = $('<span>')[0];
		var select = $('<select>')[0];
		
		li.classList.add("settingsCtrl");
		span.classList.add("ctrlName");
		select.classList.add("ctrlInput");
		
		span.innerHTML = x;
		for(var h in vals) {
			var opt = $('<option>')[0];
			opt.value = h;
			opt.innerHTML = h;
			
			select.appendChild(opt);
			
			if(s[x] === vals[h]) {
				select.value = h;
			}
		}
		
		select.addEventListener('change', function(){
			var val = vals[this.value];
			s[x] = val;
		});
		
		li.appendChild(span);
		li.appendChild(select);
		
		return li;
	}
	
	var createSectionNameControl = function(s, x) {
		var p = s[x];
		
		var li = $('<li>')[0];
		var input = $('<input>')[0];
		var ul = $('<ul>')[0];
		
		li.classList.add("settingsMajorCtrl");
		input.classList.add("ctrlMajorInput");
		ul.classList.add("ctrlOptions");
		
		input.type = 'text';
		input.placeholder = x;
		input.value = p.toString();
		
		var cloneLi = $('<li>')[0];
		var deleteLi = $('<li>')[0];
		var moveLi = $('<li>')[0];
		
		cloneLi.classList.add("fa", "fa-clone", "w3-large", "ctrlOptClone");
		deleteLi.classList.add("fa", "fa-trash-o", "w3-large", "ctrlOptDelete");
		
		var rightI = $('<i>')[0];
		var leftI = $('<i>')[0];
		
		rightI.classList.add("fa", "fa-angle-right", "w3-small", "ctrlOptRight");
		leftI.classList.add("fa", "fa-angle-left", "w3-small", "ctrlOptLeft");
		
		moveLi.classList.add("ctrlOptMoves");
		
		moveLi.appendChild(rightI);
		moveLi.appendChild($('<br>')[0]);
		moveLi.appendChild(leftI);
		
		rightI.addEventListener('click', function() {
			var index = settings.sections.indexOf(s);
			
			if(index >= settings.sections.length - 1) {
				return;
			}
			
			var a = settings.sections[index];
			settings.sections[index] = settings.sections[index + 1];
			settings.sections[index + 1] = a;
			
			refreshTabs();
			
			secTabs.children[index + 1].click();
		});
		
		leftI.addEventListener('click', function() {
			var index = settings.sections.indexOf(s);
			
			if(index <= 0) {
				return;
			}
			
			var a = settings.sections[index];
			settings.sections[index] = settings.sections[index - 1];
			settings.sections[index - 1] = a;
			
			refreshTabs();
			
			secTabs.children[index - 1].click();
		});
		
		cloneLi.addEventListener('click', function() {
			var copy = new Section(s);
			settings.sections.push(copy);
			
			actionAddTab(settings.sections.length - 1);
		});
		
		deleteLi.addEventListener('click', function() {
			var index = settings.sections.indexOf(s);
			
			settings.sections.splice(index, 1);
			
			actionRemoveTab(index);
		});
		
		ul.appendChild(moveLi);
		ul.appendChild(cloneLi);
		ul.appendChild(deleteLi);
		
		input.addEventListener('change', function(){
			s[x] = this.value;
			
			secTabs.children[settings.sections.indexOf(s)].title = s[x];
		});
		
		li.appendChild(input);
		li.appendChild(ul);
		
		return li;
	};
	
	var createSectionControls = function(s) {
		var ctrls = [];
		
		for(var x in s) {
			var ctrl = null;
			
			if(x === 'mode') {
				ctrl = createControlCombo(s, x, drawMode);
			} else if(x === 'name') {
				// Special case for name
				ctrl = createSectionNameControl(s, x);
			} else {
				ctrl = createControl(s, x);
			}
			
			if(ctrl) ctrls.push(ctrl);
		}
		
		return ctrls;
	};
	
	var actionTabClicked = function(e) {
		if(this === addTabLi) return;
		
		if(this.classList.contains('activated'))
			return;
		
		var thisIndex = -1;
		
		for(var i = 0; i < settings.sections.length; i++) {
			if(secTabs.children[i] === this) {
				thisIndex = i;
				continue;
			}
			
			if(secTabs.children[i].classList.contains('activated'))
				secTabs.children[i].classList.remove('activated');
		}
		
		this.classList.add('activated');
		
		while(sectionSettingsUl.children.length !== 0) {
			sectionSettingsUl.removeChild(sectionSettingsUl.children[0]);
		}
		
		for(var i = 0; i < sectionControls[thisIndex].length; i++) {
			sectionSettingsUl.appendChild(sectionControls[thisIndex][i]);
		}
	};
	
	var actionTabOver = function(e) {
		var index = -1;
		var child = this;
		while((child = child.previousSibling) != null)  index++;
		
		hoverSection = settings.sections[index];
	};
	
	var actionTabOut = function(e) {
		var pointerElem = document.elementFromPoint(e.clientX, e.clientY);
		
		if(!pointerElem || !pointerElem.classList.contains('sectionTab')) {
			hoverSection = null;
		}
	};
	
	var actionAddTab = function(i) {
		var tabLi = $("<li>")[0];
		tabLi.innerHTML = i.toString();
		tabLi.title = settings.sections[i].name;
		tabLi.classList.add('sectionTab');
		tabLi.addEventListener('click', actionTabClicked);
		tabLi.addEventListener('mouseover', actionTabOver);
		tabLi.addEventListener('mouseout', actionTabOut);
		
		secTabs.insertBefore(tabLi, addTabLi);
		sectionControls[i] = createSectionControls(settings.sections[i]);
	};
	
	var actionRemoveTab = function(i) {
		var e = secTabs.children[i];
		if(!e) return;
		
		e.removeEventListener('click', actionTabClicked);
		e.removeEventListener('mouseover', actionTabOver);
		e.removeEventListener('mouseout', actionTabOut);
		
		secTabs.removeChild(e);
		
		refreshTabs();
	}
	
	var refreshSettings = function() {
		while(glblSettings.children.length !== 0) {
			glblSettings.removeChild(glblSettings.children[0]);
		}
		
		for(var x in settings) {
			var ctrl = createControl(settings, x);
			
			if(ctrl) glblSettings.appendChild(ctrl);
		}
	};
	
	var refreshPresetList = function() {
		while(presetList.children.length !== 0) {
			presetList.removeChild(presetList.children[0]);
		}
		
		for(var x in settingsPresets) {
			var preset = $('<li>')[0];
			preset.innerHTML = x.toString(); // SHOULD be a string
			
			preset.addEventListener('click', (function() {
				var presetName = x;
				
				return function() {
					loadPreset(presetName);
					refreshTabs();
				};
			})());
			
			presetList.appendChild(preset);
		}
	};
	
	return function(what) {
		if(what === 0) {
			return;
		} else if(!what) {
			what = refreshables.SETTINGS_BIT | refreshables.TABS_BIT | refreshables.PRESETLIST_BIT;
		}
		
		if(!glblSettings)		glblSettings = $("#globalSettings")[0];
		if(!secTabs)			secTabs = $("#settingsSectionTabs")[0];
		if(!addTabLi)			addTabLi = $("#addTab")[0];
		if(!sectionSettingsUl)	sectionSettingsUl = $("#sectionSettings")[0];
		if(!presetList)			presetList = $("#settingsPresetsList")[0];
		if(!presetNameIn)		presetNameIn = $("#presetNameInput")[0];
		if(!loadPresetBtn)		loadPresetBtn = $("#settingsPresetsOptOpen")[0];
		if(!savePresetBtn)		savePresetBtn = $("#settingsPresetsOptSave")[0];
		if(!downloader)			downloader = $('#downloader')[0];
		if(!fileChooser)		fileChooser = $('#fileChooser')[0];
		
		if(!initialized) {
			addTabLi.addEventListener('click', function(e) {
				var newSec = new Section();
				settings.sections.push(newSec);
				
				actionAddTab(settings.sections.length - 1);
			});
			
			fileChooser.addEventListener('change', function(e) {
				for(var i = 0; i < e.target.files.length - 1; i++) {
					loadFilePreset(e.target.files[i]);
				}
				
				loadFilePreset(e.target.files[e.target.files.length - 1], true);
			});
			
			loadPresetBtn.addEventListener('click', function(e) {
				// Ask for .urm file
				fileChooser.accept = ".urm";
				fileChooser.click();
			});
			
			savePresetBtn.addEventListener('click', function(e) {
				// Download .urm
				downloader.href = "data:text/plain;base64," + btoa(JSON.stringify(settings));
				downloader.download = (presetNameIn.value ? presetNameIn.value : "untitled") + ".urm";
				downloader.click();
				
				refreshSettings();
				refreshTabs();
			});
			
			initialized = true;
		}
		
		if((what & refreshables.SETTINGS_BIT) !== 0) refreshSettings();
		if((what & refreshables.TABS_BIT) !== 0) refreshTabs();
		if((what & refreshables.PRESETLIST_BIT) !== 0) refreshPresetList();
		
		actionTabClicked.call(secTabs.children[0]);
	};
})();

function loadPreset(name) {
	settings.set(settingsPresets[name]);
	
	refreshControls();
}

$(function() {
	var requestAnimationFrame =
		window.requestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		function(callback){ setTimeout(callback, 1000/60); };
	
	var cvs = $("#cvs")[0];
	var gtx = cvs.getContext('2d');
	var ctx = new AudioContext();
	
	var audioSource;
	var gainNode;
	var analyser;
	var freqData;
	
	var imgReady = false;
	
	var img = new Image();
	var audioElement = $("#audioElement")[0];
	
	function processImageFile(imageFile) {
		if(!imageFile.type.match('image.*')) {
			return;
		}
		
		var reader = new FileReader();
		reader.addEventListener('load', function(e) {
			settings.imageURL = e.target.result;
			
			refreshControls(refreshables.SETTINGS_BIT);
		});
		
		reader.readAsDataURL(imageFile);
	}
	
	function processAudioFile(soundFile) {
		if(!soundFile.type.match('audio.*')) {
			return;
		}
		
		var reader = new FileReader();
		var fileName = soundFile.name.substr(0, soundFile.name.lastIndexOf('.'));
		document.title = "Urmusic - " + fileName;
		
		reader.addEventListener('load', function(e) {
			audioElement.src = e.target.result;
		});
		
		reader.readAsDataURL(soundFile);
	}
	
	function processFiles(files) {
		var imageFile;
		var soundFile;
		
		for(var i = 0; i < files.length; i++) {
			if(files[i].type.match('image.*')) {
				imageFile = files[i];
			} else if(files[i].type.match('audio.*')) {
				soundFile = files[i];
			} else if(files[i].name.endsWith('.urm')) {
				loadFilePreset(files[i], i === (files.length - 1));
			}
		}
		
		if(imageFile) {
			processImageFile(imageFile);
		}
		if(soundFile) {
			processAudioFile(soundFile);
		}
	}
	
	function lerp(a, b, x) {
		return a + x * (b - a);
	}
	
	function addressArray(array, i, outValue) {
		if(i < 0 || i >= array.length) {
			return outValue;
		} else {
			return array[i];
		}
	}
	
	function getValue(array, index, quadInterpolation, minValue) {
		// Quadratic interpolation
		if(quadInterpolation) {
			var rdn = Math.floor(index + 0.5);
			
			return quadCurve(
				lerp(
					addressArray(array, rdn - 1, minValue),
					addressArray(array, rdn, minValue),
					0.5),
				addressArray(array, rdn, minValue),
				lerp(addressArray(array, rdn, minValue),
					addressArray(array, rdn + 1, minValue),
					0.5),
				
				index - rdn + 0.5);
		} else {
			var flr = Math.floor(index);
			var cel = Math.ceil(index);
			
			var flrv = addressArray(array, flr, minValue);
			var celv = addressArray(array, cel, minValue);
			
			return lerp(flrv, celv, index - flr);
		}
	}
	
	function freeze(s) {
		var o = {};
		
		for(var x in s) {
			var v = s[x];
			
			if(typeof v === 'object' && v.hasOwnProperty('expr')) {
				o[x] = v.value;
			} else {
				o[x] = v;
			}
		}
		
		return o;
	}
	
	function freqValue(nind, section) {
		return Math.max(
			getValue(
				freqData,
				lerp(section.freqStart, section.freqEnd, nind) * freqData.length,
				section.quadratic,
				section.minDecibels) - section.minDecibels,
			0) / (section.maxDecibels - section.minDecibels);
	}
	
	function quadCurve(p0y, cpy, p1y, t) {
		var y = (1.0 - t) * (1.0 - t) * p0y + 2.0 * (1.0 - t) * t * cpy + t * t * p1y;
		
		return y;
	}
	
	function loop() {
		analyser.smoothingTimeConstant = settings.smoothingTimeConstant.value;
		
		if(!freqData) {
			freqData = new Float32Array(analyser.frequencyBinCount);
			
			if(audioElement.paused) {
				for(var i = 0; i < freqData.length; i++) {
					freqData[i] = Number.MIN_SAFE_INTEGER
				}
			}
		}
		
		if(!audioElement.paused) {
			analyser.getFloatFrequencyData(freqData);
		}
		
		if(cvs.width != cvs.clientWidth || cvs.height != cvs.clientHeight) {
			cvs.width = cvs.clientWidth;
			cvs.height = cvs.clientHeight;
		}
		
		frameProps.minval = Math.min.apply(Math, freqData);
		frameProps.maxval = Math.max.apply(Math, freqData);
		frameProps.time = audioElement.currentTime;
		frameProps.duration = audioElement.duration;
		
		render();
		
		requestAnimationFrame(loop);
	}
	
	function getProps(cwidth, cheight, section, per) {
		var height = Math.pow(freqValue(per, section), section.barsPow) * section.barsHeight;
		
		var x = lerp(section.barsStartX, section.barsEndX, per);
		var y = section.barsY;
		
		var ey = y + section.barsMinHeight + height;
		var ex = x;
		
		if(section.polar > 0.0) {
			var cosx = Math.cos((x * 0.5 + 0.5) * Math.PI * 2);
			var sinx = Math.sin((x * 0.5 + 0.5) * Math.PI * 2);
			
			var xp = cosx * y;
			var yp = sinx * y;
			var exp = cosx * ey;
			var eyp = sinx * ey;
			
			x = lerp(x * cwidth, xp * cwidth, section.polar);
			y = lerp(y * cheight, yp * cheight, section.polar);
			ex = lerp(ex * cwidth, exp * cwidth, section.polar);
			ey = lerp(ey * cheight, eyp * cheight, section.polar);
		} else {
			x *= cwidth;
			y *= cheight;
			ex *= cwidth;
			ey *= cheight;
		}
		
		return {
			x: x,
			y: y,
			ex: ex,
			ey: ey
		};
	}
	
	function render() {
		var aspect = cvs.width / cvs.height;
		var cwidth = cvs.width;
		var cheight = cvs.height;
		
		if(cwidth > cheight) {
			cwidth /= aspect;
		} else {
			cheight *= aspect;
		}
		
		gtx.clearRect(0, 0, cvs.width, cvs.height);
		
		gtx.fillStyle = settings.backgroundColor;
		gtx.fillRect(0, 0, cvs.width, cvs.height);
		
		gtx.save();
			gtx.translate(cvs.width/2, cvs.height/2);
			gtx.scale(0.5, -0.5);
			
			var glblscl = settings.globalScale.value;
			gtx.scale(glblscl, glblscl);
			
			gtx.translate(settings.globalOffsetX.value * cwidth, settings.globalOffsetY.value * cheight);
			gtx.rotate(settings.globalRotation.value);
			
			for(var is = 0; is < settings.sections.length; is++) {
				var section = freeze(settings.sections[is]);
				var mode = section.mode;
				
				var barCount = section.barCount;
				
				if(!section.visible) {
					continue;
				}
				
				gtx.strokeStyle = section.color;
				gtx.fillStyle = section.color;
				gtx.lineWidth = (section.barsWidth / 100) * Math.min(cvs.width, cvs.height);
				gtx.shadowColor = section.color;
				gtx.shadowBlur = section.glowness * glblscl; // Cause for some reasons, it's not scaled by the scale. This comment doesn't make sense.
				
				gtx.beginPath();
				for(var i = 0; i < barCount; i++) {
					if(!section.drawLast && i === barCount - 1) {
						break;
					}
					
					var per = i / (barCount - 1);
					
					var p = getProps(cwidth, cheight, section, per);
					
					if(mode == drawMode.lines || (i == 0 && section.clampShapeToZero)) {
						gtx.moveTo(p.x, p.y);
					}
					
					gtx.lineTo(p.ex, p.ey);
					
					if(i == barCount - 1 && section.clampShapeToZero) {
						gtx.lineTo(p.x, p.y);
					}
				}
				
				if(section.closeShape) {
					gtx.closePath();
				}
				
				if(mode == drawMode.fill) {
					gtx.fill();
					
					if(hoverSection === section) {
						gtx.fillStyle = "red";
						gtx.globalAlpha = 0.2;
						gtx.fill();
						gtx.globalAlpha = 1.0;
					}
				} else {
					gtx.stroke();
					
					if(hoverSection === section) {
						gtx.strokeStyle = "red";
						gtx.globalAlpha = 0.2;
						gtx.stroke();
						gtx.globalAlpha = 1.0;
					}
				}
			}
			
			if(imgReady) {
				gtx.shadowColor = 'rgba(0, 0, 0, 0)'
				gtx.shadowBlur = 0;
				
				var imgw = settings.imageWidth.value;
				var imgh = settings.imageHeight.value;
				
				gtx.scale(1, -1);
				gtx.rotate(settings.imageRot.value);
				gtx.drawImage(img,
					(settings.imageX.value - imgw/2) * cwidth,
					(settings.imageY.value - imgh/2) * cheight,
					imgw * cwidth,
					imgh * cheight);
			}
		gtx.restore();
	}
	
	function init() {
		if(!cvs || !gtx || !ctx) {
			alert("Your browser isn't compatible"); 
			throw new Error("Couldn't initialize");
			
			return;
		}
		
		audioSource = ctx.createMediaElementSource(audioElement);
		gainNode = ctx.createGain();
		analyser = ctx.createAnalyser();
		analyser.fftSize = 2048;
		
		cvs.width = document.body.clientWidth;
		cvs.height = document.body.clientHeight;
		
		cvs.addEventListener('dragover', function(e) {
			e.stopPropagation();
			e.preventDefault();
			
			e.dataTransfer.dropEffect = 'copy';
		}, false);
		
		cvs.addEventListener('drop', function(e) {
			e.stopPropagation();
			e.preventDefault();
			
			processFiles(e.dataTransfer.files);
		}, false);
		
		if(!localStorage.urmusic_volume) {
			localStorage.urmusic_volume = audioElement.volume;
		} else {
			audioElement.volume = localStorage.urmusic_volume;
		}
		
		audioElement.addEventListener('volumechange', function(e) {
			gainNode.gain.value = (audioElement.volume === 0 ? 0.0 : (1.0 / audioElement.volume));
			
			localStorage.urmusic_volume = audioElement.volume;
		});
		
		audioElement.crossOrigin = "anonymous";
		
		var setNav = $('#settingsNav')[0];
		var presetMenuOpenCloseBtn = $('#presetMenuOpenCloseBtn')[0];
		var presetMenu = $('#settingsPresetsMenu')[0];
		
		$('#hambParent').on('click', function(e) {
			setNav.classList.contains('activated') ? setNav.classList.remove('activated') : setNav.classList.add('activated');
			
			if(!setNav.classList.contains('activated')) {
				presetMenu.classList.remove('opened');
				presetMenuOpenCloseBtn.classList.remove('opened');
			}
		});
		
		presetMenuOpenCloseBtn.addEventListener('click', function() {
			if(this.classList.contains('opened')) {
				this.classList.remove('opened');
				presetMenu.classList.remove('opened');
			} else {
				this.classList.add('opened');
				presetMenu.classList.add('opened');
			}
		});
		
		gainNode.gain.value = (audioElement.volume === 0 ? 0.0 : (1.0 / audioElement.volume));
		
		audioSource.connect(gainNode);
		gainNode.connect(analyser);
		audioSource.connect(ctx.destination);
		
		img.addEventListener('load', function() {
			imgReady = true;
		});
		settings.watch('imageURL', function(id, oldval, newval) {
			imgReady = false;
			img.src = newval;
			
			return newval;
		});
		
		console.log(
			" _    _ ________     __  _ \n"
		+	"| |  | |  ____\\ \\   / / | |\t" +	"Hey you! This app is highly customizable\n"
		+	"| |__| | |__   \\ \\_/ /  | |\t" +	"through the JavaScript console too! Have fun!\n"
		+	"|  __  |  __|   \\   /   | |\t" +	"\n"
		+	"| |  | | |____   | |    |_|\t" +	"Urmusic V0.9\n"
		+	"|_|  |_|______|  |_|    (_)\t" +	"By Nasso (http://nasso.github.io/)\n\n");
		
		loadPreset('DubstepGutter');
		
		loop();
	}
	
	init();
});
