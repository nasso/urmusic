// TAB_SIZE = 4

// Utils
function isNullOrUndef(v) { return (v === null || v === undefined); }

function EnumerationValue(ownerEnum, name) {
	this.name = name;
	this.ownerEnum = ownerEnum;
}
EnumerationValue.prototype.toJSON = function() {
	return this.name;
};
EnumerationValue.prototype.toString = EnumerationValue.prototype.toJSON;

function Enumeration(vals) {
	if(!Array.isArray(vals)) {
		throw new Error('No values specified for the Enumeration');
	}
	
	for(var i = 0; i < vals.length; i++) {
		this[vals[i]] = new EnumerationValue(this, vals[i]);
	}
}

// The actual app
var AudioContext = window.AudioContext || window.webkitAudioContext;

var drawMode = new Enumeration(['LINES', 'FILL', 'OUTLINE']);
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
	'duration',
	
	'maxlowval',
	'minlowval',
	'maxhighval',
	'minhighval'
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
					frameProps.duration,
					
					frameProps.maxlowval,
					frameProps.minlowval,
					frameProps.maxhighval,
					frameProps.minhighval);
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

function AdvancedSettings(p) {
	this.set(p);
}
AdvancedSettings.prototype.set = function(p) {
	p = p || {};
	
	this.enableLowpass = !isNullOrUndef(p.enableLowpass) ? p.enableLowpass : false;
	this.enableHighpass = !isNullOrUndef(p.enableHighpass) ? p.enableHighpass : false;
	
	this.lowpassFreq = !isNullOrUndef(p.lowpassFreq) ? p.lowpassFreq : 120;
	this.highpassFreq = !isNullOrUndef(p.highpassFreq) ? p.highpassFreq : 480;
};

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
	this.mode = !isNullOrUndef(p.mode) ? drawMode[p.mode] : drawMode.LINES;
	this.clampShapeToZero = !isNullOrUndef(p.clampShapeToZero) ? p.clampShapeToZero : true;
	this.closeShape = !isNullOrUndef(p.closeShape) ? p.closeShape : true;
	this.smartFill = !isNullOrUndef(p.smartFill) ? p.smartFill : false;
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
	
	if(!this.advanced) this.advanced = new AdvancedSettings(p.advanced);
	else this.advanced.set(p.advanced);
};

var settingsPresets = {
	'Default': new Settings().addSection(),
	'DubstepGutter': new Settings(JSON.parse('{"smoothingTimeConstant":"0.5","sections":[{"name":"Bass top","visible":true,"minDecibels":"-70","maxDecibels":"-30","barCount":"128","freqStart":"-0.002","freqEnd":"0.02","barsWidth":"1","barsStartX":"-0.55","barsEndX":"0.1","barsY":"0.2","color":"#ffffff","barsPow":"5","barsHeight":"0.05","barsMinHeight":"0.005","glowness":"0","polar":"1","mode":"LINES","clampShapeToZero":true,"closeShape":true,"smartFill":false,"drawLast":true,"quadratic":true},{"name":"Bass bottom","visible":true,"minDecibels":"-70","maxDecibels":"-30","barCount":"128","freqStart":"-0.002","freqEnd":"0.02","barsWidth":"1","barsStartX":"0.65","barsEndX":"0.1","barsY":"0.2","color":"#ffffff","barsPow":"5","barsHeight":"0.05","barsMinHeight":"0.005","glowness":"0","polar":"1","mode":"LINES","clampShapeToZero":true,"closeShape":true,"smartFill":false,"drawLast":false,"quadratic":true},{"name":"High top","visible":true,"minDecibels":"-70","maxDecibels":"-30","barCount":"128","freqStart":"0.02","freqEnd":"0.035","barsWidth":"1","barsStartX":"1.45","barsEndX":"1.05","barsY":"0.2","color":"#ffffff","barsPow":"3","barsHeight":"0.03","barsMinHeight":"0.005","glowness":"0","polar":"1","mode":"LINES","clampShapeToZero":true,"closeShape":true,"smartFill":false,"drawLast":true,"quadratic":true},{"name":"High bottom","visible":true,"minDecibels":"-70","maxDecibels":"-30","barCount":"128","freqStart":"0.02","freqEnd":"0.035","barsWidth":"1","barsStartX":"0.65","barsEndX":"1.05","barsY":"0.2","color":"#ffffff","barsPow":"3","barsHeight":"0.03","barsMinHeight":"0.005","glowness":"0","polar":"1","mode":"LINES","clampShapeToZero":true,"closeShape":true,"smartFill":false,"drawLast":true,"quadratic":true}],"globalScale":"max(max((maxlowval + 70) / 50, 0) * 3.8, 1.5)","globalOffsetX":"rand() * max((maxlowval + 70) / 50, 0) * 0.01 - 0.005","globalOffsetY":"rand() * max((maxlowval + 70) / 50, 0) * 0.01 - 0.005","globalRotation":"0","imageURL":"dsg.png","imageX":"0","imageY":"0","imageWidth":"0.405","imageHeight":"0.405","imageRot":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":true,"enableHighpass":false,"lowpassFreq":20,"highpassFreq":480}}')),
	'Drop the Bassline': new Settings(JSON.parse('{"smoothingTimeConstant":"0.5","sections":[{"name":"A section","visible":true,"minDecibels":"-48","maxDecibels":"-20","barCount":"128","freqStart":"0","freqEnd":"0.015","barsWidth":"0.8","barsStartX":"-0.5","barsEndX":"0.5","barsY":"0.4","color":"#ffffff","barsPow":"3","barsHeight":"0.23","barsMinHeight":"0.005","glowness":"0","polar":"1","mode":"FILL","clampShapeToZero":false,"closeShape":false,"smartFill":true,"drawLast":true,"quadratic":true},{"name":"A section","visible":true,"minDecibels":"-48","maxDecibels":"-20","barCount":"128","freqStart":"0","freqEnd":"0.015","barsWidth":"0.8","barsStartX":"1.5","barsEndX":"0.5","barsY":"0.4","color":"#ffffff","barsPow":"3","barsHeight":"0.23","barsMinHeight":"0.005","glowness":"0","polar":"1","mode":"FILL","clampShapeToZero":false,"closeShape":false,"smartFill":true,"drawLast":true,"quadratic":true},{"name":"A section","visible":true,"minDecibels":"-48","maxDecibels":"-20","barCount":"128","freqStart":"0","freqEnd":"0.015","barsWidth":"0.8","barsStartX":"-0.5","barsEndX":"0.5","barsY":"0.4","color":"#ff0000","barsPow":"3","barsHeight":"0.19","barsMinHeight":"0.005","glowness":"0","polar":"1","mode":"FILL","clampShapeToZero":false,"closeShape":false,"smartFill":true,"drawLast":true,"quadratic":true},{"name":"A section","visible":true,"minDecibels":"-48","maxDecibels":"-20","barCount":"128","freqStart":"0","freqEnd":"0.015","barsWidth":"0.8","barsStartX":"1.5","barsEndX":"0.5","barsY":"0.4","color":"#ff0000","barsPow":"3","barsHeight":"0.19","barsMinHeight":"0.005","glowness":"0","polar":"1","mode":"FILL","clampShapeToZero":false,"closeShape":false,"smartFill":true,"drawLast":true,"quadratic":true},{"name":"A section","visible":true,"minDecibels":"-48","maxDecibels":"-20","barCount":"128","freqStart":"0","freqEnd":"0.015","barsWidth":"0.8","barsStartX":"-0.5","barsEndX":"0.5","barsY":"0.4","color":"#ffffff","barsPow":"3","barsHeight":"0.15","barsMinHeight":"0.005","glowness":"0","polar":"1","mode":"FILL","clampShapeToZero":false,"closeShape":false,"smartFill":true,"drawLast":true,"quadratic":true},{"name":"A section","visible":true,"minDecibels":"-48","maxDecibels":"-20","barCount":"128","freqStart":"0","freqEnd":"0.015","barsWidth":"0.8","barsStartX":"1.5","barsEndX":"0.5","barsY":"0.4","color":"#ffffff","barsPow":"3","barsHeight":"0.15","barsMinHeight":"0.005","glowness":"0","polar":"1","mode":"FILL","clampShapeToZero":false,"closeShape":false,"smartFill":true,"drawLast":true,"quadratic":true}],"globalScale":"max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","globalOffsetX":"rand() * max((maxlowval + 70) / 50, 0) * 0.01 - 0.005","globalOffsetY":"rand() * max((maxlowval + 70) / 50, 0) * 0.01 - 0.005","globalRotation":"0","imageURL":"","imageX":"0","imageY":"0","imageWidth":"0.8","imageHeight":"0.8","imageRot":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":true,"enableHighpass":false,"lowpassFreq":"100","highpassFreq":480}}')),
	'BOD': new Settings(JSON.parse('{"smoothingTimeConstant":"0.65","sections":[{"name":"A section","visible":true,"minDecibels":"-65","maxDecibels":"-10","barCount":"256","freqStart":"0","freqEnd":"0.1","barsWidth":"0.5","barsStartX":"-1","barsEndX":"1","barsY":"0.2","color":"#ff0000","barsPow":"3","barsHeight":"-1","barsMinHeight":"-0.002","glowness":"64","polar":"0","mode":"LINES","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true}],"globalScale":"1","globalOffsetX":"0","globalOffsetY":"0","globalRotation":"0","imageURL":"","imageX":"0","imageY":"0","imageWidth":"0.4","imageHeight":"0.4","imageRot":"0","backgroundColor":"#000000"}'))
};

var settings = new Settings();

var frameProps = {
	maxval: 0,
	minval: Number.MIN_SAFE_INTEGER,
	
	maxlowval: 0,
	minlowval: Number.MIN_SAFE_INTEGER,
	
	maxhighval: 0,
	minhighval: Number.MIN_SAFE_INTEGER,
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
	var advcdSettings = null;
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
		
		var li = document.createElement('li');
		var span = document.createElement('span');
		var input = document.createElement('input');
		
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
			
			if(p.hasOwnProperty('expr')) {
				input.value = p.expr;
			} else {
				if(val.startsWith('data:')) { // data url :p
					input.value = 'DataURL';
				} else {
					input.value = p.toString();
				}
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
			var chkbx = document.createElement('span');
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
		
		var li = document.createElement('li');
		var span = document.createElement('span');
		var select = document.createElement('select');
		
		li.classList.add("settingsCtrl");
		span.classList.add("ctrlName");
		select.classList.add("ctrlInput");
		
		span.innerHTML = x;
		for(var h in vals) {
			var opt = document.createElement('option');
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
		
		var li = document.createElement('li');
		var input = document.createElement('input');
		var ul = document.createElement('ul');
		
		li.classList.add("settingsMajorCtrl");
		input.classList.add("ctrlMajorInput");
		ul.classList.add("ctrlOptions");
		
		input.type = 'text';
		input.placeholder = x;
		input.value = p.toString();
		
		var cloneLi = document.createElement('li');
		var deleteLi = document.createElement('li');
		var moveLi = document.createElement('li');
		
		cloneLi.classList.add("fa", "fa-clone", "w3-large", "ctrlOptClone");
		deleteLi.classList.add("fa", "fa-trash-o", "w3-large", "ctrlOptDelete");
		
		var rightI = document.createElement('i');
		var leftI = document.createElement('i');
		
		rightI.classList.add("fa", "fa-angle-right", "w3-small", "ctrlOptRight");
		leftI.classList.add("fa", "fa-angle-left", "w3-small", "ctrlOptLeft");
		
		moveLi.classList.add("ctrlOptMoves");
		
		moveLi.appendChild(rightI);
		moveLi.appendChild(document.createElement('br'));
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
			
			if(s[x] instanceof EnumerationValue) {
				ctrl = createControlCombo(s, x, s[x].ownerEnum);
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
	
	var actionAddTab = function(i) {
		var tabLi = document.createElement("li");
		tabLi.innerHTML = i.toString();
		tabLi.title = settings.sections[i].name;
		tabLi.classList.add('sectionTab');
		tabLi.addEventListener('click', actionTabClicked);
		
		secTabs.insertBefore(tabLi, addTabLi);
		sectionControls[i] = createSectionControls(settings.sections[i]);
	};
	
	var actionRemoveTab = function(i) {
		var e = secTabs.children[i];
		if(!e) return;
		
		e.removeEventListener('click', actionTabClicked);
		
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
		
		while(advcdSettings.children.length !== 0) {
			advcdSettings.removeChild(advcdSettings.children[0]);
		}
		
		for(var x in settings.advanced) {
			var ctrl = createControl(settings.advanced, x);
			
			if(ctrl) advcdSettings.appendChild(ctrl);
		}
	};
	
	var refreshPresetList = function() {
		while(presetList.children.length !== 0) {
			presetList.removeChild(presetList.children[0]);
		}
		
		for(var x in settingsPresets) {
			var preset = document.createElement('li');
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
		
		if(!glblSettings)		glblSettings = document.getElementById("globalSettings");
		if(!advcdSettings)		advcdSettings = document.getElementById("advancedSettings");
		if(!secTabs)			secTabs = document.getElementById("settingsSectionTabs");
		if(!addTabLi)			addTabLi = document.getElementById("addTab");
		if(!sectionSettingsUl)	sectionSettingsUl = document.getElementById("sectionSettings");
		if(!presetList)			presetList = document.getElementById("settingsPresetsList");
		if(!presetNameIn)		presetNameIn = document.getElementById("presetNameInput");
		if(!loadPresetBtn)		loadPresetBtn = document.getElementById("settingsPresetsOptOpen");
		if(!savePresetBtn)		savePresetBtn = document.getElementById("settingsPresetsOptSave");
		if(!downloader)			downloader = document.getElementById('downloader');
		if(!fileChooser)		fileChooser = document.getElementById('fileChooser');
		
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
				var newPresetName = presetNameIn.value ? presetNameIn.value : "untitled";
				
				// Download .urm
				downloader.href = "data:text/plain;base64," + btoa(JSON.stringify(settings));
				downloader.download = newPresetName + ".urm";
				downloader.click();
				
				var counter = 0;
				while(settingsPresets[newPresetName] !== undefined) {
					newPresetName = (presetNameIn.value ? presetNameIn.value : "untitled") + ' (' + counter + ')';
					counter++;
				}
				
				settingsPresets[newPresetName] = new Settings(settings);
				
				refreshSettings();
				refreshTabs();
				refreshPresetList();
			});
			
			initialized = true;
		}
		
		if((what & refreshables.SETTINGS_BIT) !== 0) refreshSettings();
		if((what & refreshables.TABS_BIT) !== 0) refreshTabs();
		if((what & refreshables.PRESETLIST_BIT) !== 0) refreshPresetList();
		
		if(secTabs.children[0]) actionTabClicked.call(secTabs.children[0]);
	};
})();

function loadPreset(name) {
	if(isNullOrUndef(name)) {
		var names = [];
		
		for(var x in settingsPresets) {
			names.push(x);
		}
		
		name = names[Math.floor(Math.random() * names.length)];
	}
	
	settings.set(settingsPresets[name]);
	
	refreshControls();
}

window.onload = function() {
	var requestAnimationFrame =
		window.requestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		function(callback){ setTimeout(callback, 1000/60); };
	
	var cvs = document.getElementById("cvs");
	var gtx = cvs.getContext('2d');
	var ctx = new AudioContext();
	
	var audioSource;
	var gainNode;
	var analyser;
	var freqData;
	
	var lowpass;
	var lowAnalyser;
	var lowFreqData;
	
	var highpass;
	var highAnalyser;
	var highFreqData;
	
	var imgReady = false;
	
	var img = new Image();
	var audioElement = document.getElementById("audioElement");
	var helpNav = document.getElementById('helpNav');
	
	var firefoxIsBetter = document.getElementById('firefoxIsBetter');
	var closeWarning = firefoxIsBetter.getElementsByClassName('close')[0];
	
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
			
			audioElement.play();
		});
		
		reader.readAsDataURL(soundFile);
		
		if(!helpNav.classList.contains("masked")) helpNav.classList.add("masked");
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
		lowAnalyser.smoothingTimeConstant = settings.smoothingTimeConstant.value;
		highAnalyser.smoothingTimeConstant = settings.smoothingTimeConstant.value;
		
		if(!freqData) {
			freqData = new Float32Array(analyser.frequencyBinCount);
			
			if(audioElement.paused) {
				for(var i = 0; i < freqData.length; i++) {
					freqData[i] = Number.MIN_SAFE_INTEGER;
				}
			}
		}
		
		if(settings.advanced.enableLowpass) {
			if(!lowFreqData) {
				lowFreqData = new Float32Array(lowAnalyser.frequencyBinCount);
				
				if(audioElement.paused) {
					for(var i = 0; i < lowFreqData.length; i++) {
						lowFreqData[i] = Number.MIN_SAFE_INTEGER;
					}
				}
			}
		}
		
		if(settings.advanced.enableHighpass) {
			if(!highFreqData) {
				highFreqData = new Float32Array(highAnalyser.frequencyBinCount);
				
				if(audioElement.paused) {
					for(var i = 0; i < highFreqData.length; i++) {
						highFreqData[i] = Number.MIN_SAFE_INTEGER;
					}
				}
			}
		}
		
		if(!audioElement.paused) {
			analyser.getFloatFrequencyData(freqData);
			
			if(settings.advanced.enableLowpass) {
				lowAnalyser.getFloatFrequencyData(lowFreqData);
			}
			
			if(settings.advanced.enableHighpass) {
				highAnalyser.getFloatFrequencyData(highFreqData);
			}
		}
		
		if(cvs.width != cvs.clientWidth || cvs.height != cvs.clientHeight) {
			cvs.width = cvs.clientWidth;
			cvs.height = cvs.clientHeight;
		}
		
		frameProps.minval = Math.min.apply(Math, freqData);
		frameProps.maxval = Math.max.apply(Math, freqData);
		frameProps.time = audioElement.currentTime;
		frameProps.duration = audioElement.duration;
		
		if(settings.advanced.enableLowpass) {
			frameProps.maxlowval = Math.max.apply(Math, lowFreqData);
			frameProps.minlowval = Math.min.apply(Math, lowFreqData);
		}
		
		if(settings.advanced.enableHighpass) {
			frameProps.maxhighval = Math.max.apply(Math, highFreqData);
			frameProps.minhighval = Math.min.apply(Math, highFreqData);
		}
		
		render();
		
		requestAnimationFrame(loop);
	}
	
	function getFootProps(cwidth, cheight, section, per) {
		var x = lerp(section.barsStartX, section.barsEndX, per);
		var y = section.barsY;
		
		if(section.polar > 0.0) {
			var cosx = Math.cos((x * 0.5 + 0.5) * Math.PI * 2);
			var sinx = Math.sin((x * 0.5 + 0.5) * Math.PI * 2);
			
			var xp = cosx * y;
			var yp = sinx * y;
			
			x = lerp(x * cwidth, xp * cwidth, section.polar);
			y = lerp(y * cheight, yp * cheight, section.polar);
		} else {
			x *= cwidth;
			y *= cheight;
		}
		
		return {
			x: x,
			y: y
		};
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
					
					if(mode == drawMode.LINES || (i == 0 && section.clampShapeToZero)) {
						gtx.moveTo(p.x, p.y);
					}
					
					gtx.lineTo(p.ex, p.ey);
					
					if(i == barCount - 1 && section.clampShapeToZero) {
						gtx.lineTo(p.x, p.y);
					}
				}
				
				if(section.closeShape && mode === drawMode.OUTLINE) { // Only affects outline mode
					gtx.closePath();
				}
				
				if(mode === drawMode.FILL) {
					if(section.smartFill) {
						for(var i = barCount - 1; i >= 0; i--) {
							if(!section.drawLast && i === barCount - 1) {
								continue;
							}
							
							var per = i / (barCount - 1);
							var fp = getFootProps(cwidth, cheight, section, per);
							
							gtx.lineTo(fp.x, fp.y);
						}
					}
					
					gtx.fill();
				} else {
					gtx.stroke();
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
	
	function warnIfNotFirefox() {
		if(navigator.userAgent.indexOf('Firefox/') === -1) {
			firefoxIsBetter.style.marginRight = '0px';
		}
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
		
		
		lowpass = ctx.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowAnalyser = ctx.createAnalyser();
		lowAnalyser.fftSize = 2048;
		
		highpass = ctx.createBiquadFilter();
		highpass.type = 'highpass';
		highAnalyser = ctx.createAnalyser();
		highAnalyser.fftSize = 2048;
		
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
		
		var setNav = document.getElementById('settingsNav');
		var presetMenuOpenCloseBtn = document.getElementById('presetMenuOpenCloseBtn');
		var presetMenu = document.getElementById('settingsPresetsMenu');
		
		document.getElementById('hambParent').addEventListener('click', function(e) {
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
		closeWarning.addEventListener('click', function() {
			firefoxIsBetter.style.marginRight = '';
		});
		
		gainNode.gain.value = (audioElement.volume === 0 ? 0.0 : (1.0 / audioElement.volume));
		
		lowpass.connect(lowAnalyser);
		highpass.connect(highAnalyser);
		
		audioSource.connect(gainNode);
		gainNode.connect(analyser);
		gainNode.connect(lowpass);
		gainNode.connect(highpass);
		audioSource.connect(ctx.destination);
		
		img.addEventListener('load', function() {
			imgReady = true;
		});
		settings.watch('imageURL', function(id, oldval, newval) {
			imgReady = false;
			img.src = newval;
			
			return newval;
		});
		settings.advanced.watch('lowpassFreq', function(id, oldval, newval) {
			lowpass.frequency.value = newval;
			return newval;
		});
		settings.advanced.watch('highpassFreq', function(id, oldval, newval) {
			highpass.frequency.value = newval;
			return newval;
		});
		settings.advanced.lowpassFreq = settings.advanced.lowpassFreq;
		settings.advanced.highpassFreq = settings.advanced.highpassFreq;
		
		console.log(
			" _    _ ________     __  _ \n"
		+	"| |  | |  ____\\ \\   / / | |\t" +	"Hey you! This app is highly customizable through the JavaScript\n"
		+	"| |__| | |__   \\ \\_/ /  | |\t" +	"console too! Have fun, and try not to broke everything :p!\n"
		+	"|  __  |  __|   \\   /   | |\t" +	"\n"
		+	"| |  | | |____   | |    |_|\t" +	"Urmusic V1.0.1\n"
		+	"|_|  |_|______|  |_|    (_)\t" +	"By Nasso (https://nasso.github.io/)\n\n");
		
		loadPreset();
		
		loop();
		
		warnIfNotFirefox();
	}
	
	init();
};
