// TAB_SIZE = 4

// Utils
// object.watch
if (!Object.prototype.watch) {
	Object.defineProperty(Object.prototype, "watch", {
		  enumerable: false
		, configurable: true
		, writable: false
		, value: function (prop, handler) {
			var
			  oldval = this[prop]
			, newval = oldval
			, getter = function () {
				return newval;
			}
			, setter = function (val) {
				oldval = newval;
				return newval = handler.call(this, prop, oldval, val);
			}
			;
			
			if (delete this[prop]) { // can't watch constants
				Object.defineProperty(this, prop, {
					  get: getter
					, set: setter
					, enumerable: true
					, configurable: true
				});
			}
		}
	});
}

// object.unwatch
if (!Object.prototype.unwatch) {
	Object.defineProperty(Object.prototype, "unwatch", {
		  enumerable: false
		, configurable: true
		, writable: false
		, value: function (prop) {
			var val = this[prop];
			delete this[prop]; // remove accessors
			this[prop] = val;
		}
	});
}

function lerp(a, b, x) {
	return a + x * (b - a);
}

var smoothrand = (function() {
	var randset = [];
	
	var flr = 0;
	var ceil = 0;
	
	return function(i) {
		i = i < 0 ? -i : i;
		
		flr = i | 0;
		ceil = (i+1) | 0;
		
		if(isNullOrUndef(randset[flr])) randset[flr] = Math.random();
		if(isNullOrUndef(randset[ceil])) randset[ceil] = Math.random();
		
		return lerp(randset[flr], randset[ceil], Math.cos((i - flr) * -1 * Math.PI) * -0.5 + 0.5);
	};
})();

function prettyTime(s) {
	s = s || 0;
	
	var seconds = (s % 60) | 0;
	var minutes = (s / 60 % 60) | 0;
	var hours = (s / 3600) | 0;
	
	if(hours) return hours+':'+('0'+minutes).substr(-2)+':'+('0'+seconds).substr(-2);
	else return minutes+':'+('0'+seconds).substr(-2);
}

CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
	r = Math.max(r, 0);
	if(r === 0) {
		this.beginPath();
		this.rect(x, y, w, h);
		return;
	}
	
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	this.beginPath();
	this.moveTo(x+r, y);
	this.arcTo(x+w, y,   x+w, y+h, r);
	this.arcTo(x+w, y+h, x,   y+h, r);
	this.arcTo(x,   y+h, x,   y,   r);
	this.arcTo(x,   y,   x+w, y,   r);
	this.closePath();
}

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

function clamp(x, a, b) {
	return Math.max(Math.min(x, b), a);
}

// The actual app
var AudioContext = window.AudioContext || window.webkitAudioContext;
var MediaStream = window.MediaStream || window.webkitMediaStream;
var MediaRecorder = window.MediaRecorder || window.webkitMediaRecorder;

var drawMode = new Enumeration([
	'LINES',
	'FILL',
	'OUTLINE'
]);

var sectionType = new Enumeration([
	'FREQ',
	'TIME_DOM',
	'IMAGE',
	'TEXT'
]);

var lineCapMode = new Enumeration([
	'BUTT',
	'ROUND',
	'SQUARE'
]);

var lineJoinMode = new Enumeration([
	'MITER',
	'ROUND',
	'BEVEL'
]);

var textAlignMode = new Enumeration([
	'LEFT',
	'CENTER',
	'RIGHT'
]);

var textBaselineMode = new Enumeration([
	'TOP',
	'HANGING',
	'MIDDLE',
	'ALPHABETIC',
	'IDEOGRAPHIC',
	'BOTTOM'
]);

var refreshables = {
	SETTINGS_BIT: 1,
	TABS_BIT: 2,
	PRESETLIST_BIT: 4
};

var exprArgs = [
	'alert',
	'window',
	'navigator',
	
	'rand',
	'smoothrand',
	'max',
	'min',
	'clamp',
	'floor',
	'ceil',
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
	'minhighval',
	
	'csize',
	
	// Section type specific
	'imgw',
	'imgh',
	'imgr',
	
	'songtitle',
	'prettytime',
	'prettyduration'
];

var frameProps = {
	maxval: 0,
	minval: Number.MIN_SAFE_INTEGER,
	
	maxlowval: 0,
	minlowval: Number.MIN_SAFE_INTEGER,
	
	maxhighval: 0,
	minhighval: Number.MIN_SAFE_INTEGER,
	
	csize: 0,
	
	imgw: 0,
	imgh: 0,
	imgr: 0,
	
	time: 0,
	duration: 0,
	prettytime: "0:00",
	prettyduration: "0:00"
};

var currentSongTitle = "Silence";

function ExpressionProperty(v) {
	if(!v) v = 0;
	
	if(v instanceof ExpressionProperty) {
		v = v.expr;
	}
	
	var expr = v.toString();
	var gtr = new Function(exprArgs.join(','), 'return (' + expr + ')');
	var constantNumber = +expr;
	
	Object.defineProperty(this, 'value', {
		get: function() {
			if(!Number.isNaN(constantNumber)) return constantNumber;
			
			try {
				return gtr(
					null, null, null,
					
					Math.random,
					smoothrand,
					Math.max,
					Math.min,
					clamp,
					Math.floor,
					Math.ceil,
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
					frameProps.minhighval,
					
					frameProps.csize,
					
					frameProps.imgw,
					frameProps.imgh,
					frameProps.imgr,
					
					currentSongTitle,
					frameProps.prettytime,
					frameProps.prettyduration);
			} catch(e) {
				return 0;
			}
		}
	});
	
	Object.defineProperty(this, 'expr', {
		get: function() {
			return expr;
		},
		
		set: function(val) {
			if(val === '') val = '0';
			
			expr = val;
			constantNumber = +val;
			
			if(Number.isNaN(constantNumber)) {
				gtr = new Function(exprArgs.join(','), 'return (' + expr + ')');
			}
		}
	});
}
ExpressionProperty.prototype.toJSON = function() {
	return this.expr;
};

function AdvancedSettings(p) {
	this.set(p);
}
AdvancedSettings.prototype.set = function(p) {
	p = p || {};
	
	this.enableLowpass = !isNullOrUndef(p.enableLowpass) ? p.enableLowpass : false;
	this.enableHighpass = !isNullOrUndef(p.enableHighpass) ? p.enableHighpass : false;
	
	this.lowpassFreq = !isNullOrUndef(p.lowpassFreq) ? +p.lowpassFreq : 120;
	this.highpassFreq = !isNullOrUndef(p.highpassFreq) ? +p.highpassFreq : 480;
	
	this.lowpassSmooth = !isNullOrUndef(p.lowpassSmooth) ? +p.lowpassSmooth : 0.65;
	this.highpassSmooth = !isNullOrUndef(p.highpassSmooth) ? +p.highpassSmooth : 0.65;
};

function AnalyserSection(p) {
	p = p || {};
	
	this.dataCount = new ExpressionProperty(!isNullOrUndef(p.dataCount) ? p.dataCount : 128);
	this.lineWidth = new ExpressionProperty(!isNullOrUndef(p.lineWidth) ? p.lineWidth : 1.0);
	this.lineCap = !isNullOrUndef(p.lineCap) ? lineCapMode[p.lineCap] : lineCapMode.BUTT;
	this.startX = new ExpressionProperty(!isNullOrUndef(p.startX) ? p.startX : -1);
	this.endX = new ExpressionProperty(!isNullOrUndef(p.endX) ? p.endX : 1);
	this.yPos = new ExpressionProperty(!isNullOrUndef(p.yPos) ? p.yPos : 0);
	this.exponent = new ExpressionProperty(!isNullOrUndef(p.exponent) ? p.exponent : 1);
	this.height = new ExpressionProperty(!isNullOrUndef(p.height) ? p.height : 0.5);
	this.mode = !isNullOrUndef(p.mode) ? drawMode[p.mode] : drawMode.LINES;
	this.polar = new ExpressionProperty(!isNullOrUndef(p.polar) ? p.polar : 0.0);
	this.clampShapeToZero = !isNullOrUndef(p.clampShapeToZero) ? p.clampShapeToZero : true;
	this.closeShape = !isNullOrUndef(p.closeShape) ? p.closeShape : true;
	this.drawLast = !isNullOrUndef(p.drawLast) ? p.drawLast : true;
	this.quadratic = !isNullOrUndef(p.quadratic) ? p.quadratic : true;
}

function FreqSection(p) {
	AnalyserSection.call(this, p);
	
	p = p || {};
	
	this.minDecibels = new ExpressionProperty(!isNullOrUndef(p.minDecibels) ? p.minDecibels : -100);
	this.maxDecibels = new ExpressionProperty(!isNullOrUndef(p.maxDecibels) ? p.maxDecibels : -20);
	this.minHeight = new ExpressionProperty(!isNullOrUndef(p.minHeight) ? p.minHeight : 0.01);
	this.freqStart = new ExpressionProperty(!isNullOrUndef(p.freqStart) ? p.freqStart : 0);
	this.freqEnd = new ExpressionProperty(!isNullOrUndef(p.freqEnd) ? p.freqEnd : 0.03);
	this.smartFill = !isNullOrUndef(p.smartFill) ? p.smartFill : false;
}

function TimeDomSection(p) {
	AnalyserSection.call(this, p);
	
	p = p || {};

	this.lineJoin = !isNullOrUndef(p.lineJoin) ? lineJoinMode[p.lineJoin] : lineJoinMode.ROUND;
}

function ImageSection(p) {
	p = p || {};
	
	this.imageURL = !isNullOrUndef(p.imageURL) ? p.imageURL : '';
	this.imageBorderRadius = new ExpressionProperty(!isNullOrUndef(p.imageBorderRadius) ? p.imageBorderRadius : 0.0);
	this.opaque = !isNullOrUndef(p.opaque) ? p.opaque : false;
	this.borderSize = new ExpressionProperty(!isNullOrUndef(p.borderSize) ? p.borderSize : 0.0);
	
	this.borderColor = !isNullOrUndef(p.borderColor) ? p.borderColor : '#ffffff';
	this.borderVisible = !isNullOrUndef(p.borderVisible) ? p.borderVisible : false;
	
	var that = this;
	this.image = new Image();
	
	var imageReady = false;
	this.image.onload = function() {
		imageReady = true;
	};
	
	Object.defineProperty(this, 'imageReady', {
		get: function() {
			return imageReady;
		}
	});
	
	this.watch('imageURL', function(id, oldVal, newVal) {
		imageReady = false;
		that.image.src = newVal;
		
		return newVal;
	});
	
	this.image.src = this.imageURL;
}

function TextSection(p) {
	p = p || {};
	
	this.text = new ExpressionProperty(!isNullOrUndef(p.text) ? p.text : '"Type your text here"');
	this.fontStyle = !isNullOrUndef(p.fontStyle) ? p.fontStyle : "normal";
	this.fontSize = new ExpressionProperty(!isNullOrUndef(p.fontSize) ? p.fontSize : 0.2);
	this.fontFamily = !isNullOrUndef(p.fontFamily) ? p.fontFamily : "sans-serif";
	this.textAlign = !isNullOrUndef(p.textAlign) ? textAlignMode[p.textAlign] : textAlignMode.CENTER;
	this.textBaseline = !isNullOrUndef(p.textBaseline) ? textBaselineMode[p.textBaseline] : textBaselineMode.ALPHABETIC;
}

function Section(p) {
	p = p || {};
	
	this.name = !isNullOrUndef(p.name) ? p.name : 'A section';
	this.type = !isNullOrUndef(p.type) ? sectionType[p.type] : sectionType.FREQ;
	this.visible = !isNullOrUndef(p.visible) ? p.visible : true;
	this.opacity = new ExpressionProperty(!isNullOrUndef(p.opacity) ? p.opacity : 1.0);
	this.posX = new ExpressionProperty(!isNullOrUndef(p.posX) ? p.posX : 0.0);
	this.posY = new ExpressionProperty(!isNullOrUndef(p.posY) ? p.posY : 0.0);
	this.rotation = new ExpressionProperty(!isNullOrUndef(p.rotation) ? p.rotation : 0.0);
	this.scaleX = new ExpressionProperty(!isNullOrUndef(p.scaleX) ? p.scaleX : 1.0);
	this.scaleY = new ExpressionProperty(!isNullOrUndef(p.scaleY) ? p.scaleY : 1.0);
	this.color = !isNullOrUndef(p.color) ? p.color : '#ffffff';
	this.glowness = new ExpressionProperty(!isNullOrUndef(p.glowness) ? p.glowness : 0.0);
	this.target = null;
	
	if(this.type === sectionType.FREQ) {
		this.target = new FreqSection(p.target ? p.target : p);
	} else if(this.type === sectionType.TIME_DOM) {
		this.target = new TimeDomSection(p.target ? p.target : p);
	} else if(this.type === sectionType.IMAGE) {
		this.target = new ImageSection(p.target ? p.target : p);
	} else if(this.type === sectionType.TEXT) {
		this.target = new TextSection(p.target ? p.target : p);
	}
	
	var that = this;
	this.watch('type', function(pname, oldVal, newVal) {
		if(!(oldVal instanceof EnumerationValue && oldVal.ownerEnum === sectionType) || newVal === oldVal) {
			return oldVal;
		}
		
		if(newVal === sectionType.FREQ) {
			that.target = new FreqSection(that.target);
		} else if(newVal === sectionType.TIME_DOM) {
			that.target = new TimeDomSection(that.target);
		} else if(newVal === sectionType.IMAGE) {
			that.target = new ImageSection(that.target);
		} else if(newVal === sectionType.TEXT) {
			that.target = new TextSection(that.target);
		}
		
		refreshControls(refreshables.TABS_BIT);
		
		return newVal;
	});
}

function Settings(p) {
	this.set(p);
}
Settings.prototype = {
	addSection: function(p) {
		this.sections.push(new Section(p));
		
		return this;
	},
	set: function(p) {
		p = p || {};
		
		this.smoothingTimeConstant = new ExpressionProperty(!isNullOrUndef(p.smoothingTimeConstant) ? p.smoothingTimeConstant : 0.65);
		
		this.sections = [];
		if(Array.isArray(p.sections)) {
			for(var i = 0; i < p.sections.length; i++) {
				this.addSection(p.sections[i]);
			}
		}
		
		this.globalScale = new ExpressionProperty(!isNullOrUndef(p.globalScale) ? p.globalScale : 1.0);
		this.globalOffsetX = new ExpressionProperty(!isNullOrUndef(p.globalOffsetX) ? p.globalOffsetX : 0.0);
		this.globalOffsetY = new ExpressionProperty(!isNullOrUndef(p.globalOffsetY) ? p.globalOffsetY : 0.0);
		this.globalRotation = new ExpressionProperty(!isNullOrUndef(p.globalRotation) ? p.globalRotation : 0.0);
		
		this.backgroundColor = !isNullOrUndef(p.backgroundColor) ? p.backgroundColor : '#3b3b3b';
		
		if(!this.advanced) this.advanced = new AdvancedSettings(p.advanced);
		else this.advanced.set(p.advanced);
	}
};

var settingsPresets = {
	'Default': new Settings().addSection(),
	'Time domain default': new Settings(JSON.parse('{"smoothingTimeConstant":"0.65","sections":[{"name":"A section","type":"TIME_DOM","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"256","lineWidth":"1","lineCap":"BUTT","polar":"0","lineJoin":"ROUND","startX":"-1","endX":"1","yPos":"0","exponent":"1","height":"0.5","mode":"OUTLINE","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true}}],"globalScale":"1","globalOffsetX":"0","globalOffsetY":"0","globalRotation":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":false,"enableHighpass":false,"lowpassFreq":120,"highpassFreq":480}}')),
	'The Dub Rebellion': new Settings(JSON.parse('{"smoothingTimeConstant":"0.5","sections":[{"name":"Background","type":"IMAGE","visible":true,"opacity":"1","posX":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","posY":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","rotation":"0","scaleX":"(imgr * 2.4) / max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","scaleY":"2.4 / max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","color":"#ffffff","glowness":"0","target":{"imageURL":"me163.jpg","imageBorderRadius":"0","image":{}}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#fbfe5c","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.4","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#fbfe5c","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"2.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.4","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#fe89d8","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.3","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#fe89d8","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"2.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.3","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#c6def7","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.2","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#c6def7","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"2.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.2","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#505986","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.1","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#505986","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"2.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.1","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"IMAGE","visible":true,"opacity":"1","posX":"0.006","posY":"0.018","rotation":"0","scaleX":"1.15","scaleY":"1.15","color":"#ffffff","glowness":"0","target":{"imageURL":"tdr.png","imageBorderRadius":"0","image":{}}}],"globalScale":"max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","globalOffsetX":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalOffsetY":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalRotation":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":true,"enableHighpass":false,"lowpassFreq":100,"highpassFreq":480,"lowpassSmooth":0.8,"highpassSmooth":0.8}}')),
	'Monstercat': new Settings(JSON.parse('{"smoothingTimeConstant":"0.8","sections":[{"name":"Background","type":"IMAGE","visible":true,"opacity":"1","posX":"0.02 * (smoothrand(time) * 2 - 1)","posY":"0.02 * (smoothrand(time + duration) * 2 - 1)","rotation":"0","scaleX":"imgr * 2.4","scaleY":"2.4","color":"#ffffff","glowness":"0","target":{"imageURL":"me163.jpg","imageBorderRadius":"0","image":{}}},{"name":"Frequency bars","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"64","lineWidth":"2.5","lineCap":"BUTT","startX":"-1","endX":"1","yPos":"0","exponent":"6","height":"0.4","mode":"LINES","polar":"0","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true,"minDecibels":"-60","maxDecibels":"-20","minHeight":"0.01","freqStart":"0","freqEnd":"0.02","smartFill":false}},{"name":"Title 1","type":"TEXT","visible":true,"opacity":"1","posX":"-0.6","posY":"-0.06","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"text":"\\"MONSTERCAT PODCAST\\"","fontStyle":"bold","fontSize":"0.12","fontFamily":"Verdana","textAlign":"LEFT","textBaseline":"TOP"}},{"name":"Title 2","type":"TEXT","visible":true,"opacity":"1","posX":"-0.6","posY":"-0.19","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"text":"\\"EP. 122\\"","fontStyle":"bold","fontSize":"0.12","fontFamily":"Verdana","textAlign":"LEFT","textBaseline":"TOP"}},{"name":"Subtitle","type":"TEXT","visible":true,"opacity":"1","posX":"-0.6","posY":"-0.33","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"text":"\\"Direct Takeover\\"","fontStyle":"normal","fontSize":"0.12","fontFamily":"Verdana","textAlign":"LEFT","textBaseline":"TOP"}},{"name":"Artwork","type":"IMAGE","visible":true,"opacity":"1","posX":"-0.82","posY":"-0.25","rotation":"0","scaleX":"0.4","scaleY":"0.4","color":"#ffffff","glowness":"0","target":{"imageURL":"mc.png","imageBorderRadius":"0","image":{}}}],"globalScale":"1","globalOffsetX":"0","globalOffsetY":"0","globalRotation":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":false,"enableHighpass":false,"lowpassFreq":120,"highpassFreq":480,"lowpassSmooth":0.65,"highpassSmooth":0.65}}')),
	'DubstepGutter': new Settings(JSON.parse('{"smoothingTimeConstant":"0.5","sections":[{"name":"Background","type":"IMAGE","visible":true,"opacity":"1","posX":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","posY":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","rotation":"0","scaleX":"(imgr * 2.4) / max(max((maxlowval + 70) / 50, 0) * 3.8, 1.5)","scaleY":"2.4 / max(max((maxlowval + 70) / 50, 0) * 3.8, 1.5)","color":"#ffffff","glowness":"0","target":{"imageURL":"me163.jpg","imageBorderRadius":"0","image":{}}},{"name":"Bass top","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"1","lineCap":"ROUND","startX":"-0.55","endX":"0.1","yPos":"0.2","exponent":"5","height":"0.04","mode":"FILL","polar":"1","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true,"minDecibels":"-70","maxDecibels":"-30","minHeight":"0","freqStart":"0","freqEnd":"0.014","smartFill":true}},{"name":"Bass bottom","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"1","lineCap":"ROUND","startX":"0.65","endX":"0.1","yPos":"0.2","exponent":"5","height":"0.04","mode":"FILL","polar":"1","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true,"minDecibels":"-70","maxDecibels":"-30","minHeight":"0","freqStart":"0","freqEnd":"0.014","smartFill":true}},{"name":"High top","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"1","lineCap":"ROUND","startX":"1.45","endX":"1.05","yPos":"0.2","exponent":"3","height":"0.03","mode":"FILL","polar":"1","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true,"minDecibels":"-70","maxDecibels":"-30","minHeight":"0","freqStart":"0.02","freqEnd":"0.03","smartFill":true}},{"name":"High bottom","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"1","lineCap":"ROUND","startX":"0.65","endX":"1.05","yPos":"0.2","exponent":"3","height":"0.03","mode":"FILL","polar":"1","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true,"minDecibels":"-70","maxDecibels":"-30","minHeight":"0","freqStart":"0.02","freqEnd":"0.03","smartFill":true}},{"name":"Image","type":"IMAGE","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"0.41","scaleY":"0.41","color":"#ffffff","glowness":"0","target":{"imageURL":"dsg.png","imageBorderRadius":"0.5","image":{}}}],"globalScale":"max(max((maxlowval + 70) / 50, 0) * 3.8, 1.5)","globalOffsetX":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalOffsetY":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalRotation":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":true,"enableHighpass":false,"lowpassFreq":20,"highpassFreq":480,"lowpassSmooth":0.8,"highpassSmooth":0.8}}')),
	'Drop the Bassline': new Settings(JSON.parse('{"smoothingTimeConstant":"0.5","sections":[{"name":"Background","type":"IMAGE","visible":true,"opacity":"1","posX":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","posY":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","rotation":"0","scaleX":"(imgr * 2.4) / max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","scaleY":"2.4 / max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","color":"#ffffff","glowness":"0","target":{"imageURL":"me163.jpg","imageBorderRadius":"0","image":{}}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-0.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.23","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.23","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ff0000","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-0.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.19","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ff0000","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.19","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-0.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.15","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.15","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"IMAGE","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"0.8","scaleY":"0.8","color":"#ffffff","glowness":"0","target":{"imageURL":"dtb.png","imageBorderRadius":"0.5","image":{}}}],"globalScale":"max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","globalOffsetX":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalOffsetY":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalRotation":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":true,"enableHighpass":false,"lowpassFreq":100,"highpassFreq":480,"lowpassSmooth":0.8,"highpassSmooth":0.8}}')),
	'BOD': new Settings(JSON.parse('{"smoothingTimeConstant":"0.65","sections":[{"name":"A section","visible":true,"minDecibels":"-65","maxDecibels":"-10","dataCount":"256","freqStart":"0","freqEnd":"0.1","lineWidth":"0.5","startX":"-1","endX":"1","yPos":"0.2","color":"#ff0000","exponent":"3","height":"-1","minHeight":"-0.002","glowness":"64","polar":"0","mode":"LINES","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true}],"globalScale":"1","globalOffsetX":"0","globalOffsetY":"0","globalRotation":"0","imageURL":"","imageX":"0","imageY":"0","imageWidth":"0.4","imageHeight":"0.4","imageRot":"0","backgroundColor":"#000000"}'))
};

var settings = new Settings();

var activeSection = null;

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
			
			if(secTabs.children.length > 1) {
				secTabs.children[Math.min(thisIndex, secTabs.children.length - 2)].classList.add("activated");
				activeSection = settings.sections[Math.min(thisIndex, secTabs.children.length - 2)];
			} else {
				activeSection = null;
			}
		} else {
			activeSection = null;
		}
	};
	
	var createControl = function(s, x) {
		var p = s[x];
		if(isNullOrUndef(p)) p = '';
		
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
			
			input.placeholder = p instanceof ExpressionProperty ? 'expression' : (typeof p);
			
			var val = p.toString();
			if(p instanceof ExpressionProperty) {
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
	
	var createSectionControls = (function() {
		var ctrls = null;
		
		function addControlsFor(s) {
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
		}
		
		return function(s) {
			ctrls = [];
			
			addControlsFor(s);
			addControlsFor(s.target);
			
			return ctrls;
		}
	})();
	
	var actionTabClicked = function() {
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
		
		activeSection = settings.sections[thisIndex];
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
		
		if((what & refreshables.SETTINGS_BIT) !== 0) refreshSettings();
		if((what & refreshables.TABS_BIT) !== 0) refreshTabs();
		if((what & refreshables.PRESETLIST_BIT) !== 0) refreshPresetList();
		
		if(!initialized) {
			addTabLi.addEventListener('click', function() {
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
			
			loadPresetBtn.addEventListener('click', function() {
				// Ask for .urm file
				fileChooser.accept = ".urm";
				fileChooser.click();
			});
			
			savePresetBtn.addEventListener('click', function() {
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
			
			if(secTabs.children.length > 1) actionTabClicked.call(secTabs.children[0]);
			
			initialized = true;
		}
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

window.addEventListener('load', function() {
	var requestAnimationFrame =
		window.requestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		function(callback){ setTimeout(callback, 1000/60); };
	
	var cvs = document.getElementById("cvs");
	var gtx = cvs.getContext('2d');
	var ctx = new AudioContext();
	var scClientID = '09bfcfe5b0303000a41b9e9675c0cb47';
	var spinnerOpts = {
		lines: 8, // The number of lines to draw
		length: 0, // The length of each line
		width: 14, // The line thickness
		radius: 19, // The radius of the inner circle
		scale: 0.3, // Scales overall size of the spinner
		corners: 1, // Corner roundness (0..1)
		color: '#fff', // #rgb or #rrggbb or array of colors
		opacity: 0, // Opacity of the lines
		rotate: 90, // The rotation offset
		direction: 1, // 1: clockwise, -1: counterclockwise
		speed: 1.5, // Rounds per second
		trail: 100, // Afterglow percentage
		fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
		zIndex: 2e9, // The z-index (defaults to 2000000000)
		className: 'spinner', // The CSS class to assign to the spinner
		top: '50%', // Top position relative to parent
		left: '50%', // Left position relative to parent
		shadow: false, // Whether to render a shadow
		hwaccel: true, // Whether to use hardware acceleration
		position: 'absolute' // Element positioning
	};
	
	var audioSource;
	var gainNode;
	var analyser;
	var freqData;
	var timeData;
	
	var lowpass;
	var lowAnalyser;
	var lowFreqData;
	
	var highpass;
	var highAnalyser;
	var highFreqData;

	var audioElement = document.getElementById("audioElement");
	var helpNav = document.getElementById('helpNav');
	var thePlayer = document.getElementById('itsThePlayer');
	
	var firefoxIsBetter = document.getElementById('firefoxIsBetter');
	var closeWarning = firefoxIsBetter.getElementsByClassName('close')[0];
	var musicApps = document.getElementById('musicApps');
	
	var bottomMenuOpener = document.getElementById('bottomMenuOpener');
	var bottomMenu = document.getElementById('bottomMenu');
	var buttonRecord = document.getElementById('videoRecord');
	
	var cvs_strm_track = cvs.captureStream().getTracks()[0];
	var aud_strm_track = ctx.createMediaStreamDestination().stream.getTracks()[0];
	var recorder = new MediaRecorder(new MediaStream([cvs_strm_track, aud_strm_track]));
	
	var hidableStuff = document.getElementsByClassName('hidable');
	
	function processImageFile(imageFile) {
		if(!imageFile.type.match('image.*') || !activeSection || activeSection.type !== sectionType.IMAGE) {
			return;
		}
		
		var reader = new FileReader();
		reader.addEventListener('load', function(e) {
			activeSection.target.imageURL = e.target.result;
			
			refreshControls(refreshables.TABS_BIT);
		});
		
		reader.readAsDataURL(imageFile);
	}
	
	function processAudioDataURL(title, theurl) {
		audioElement.src = theurl;
		currentSongTitle = title;
		document.title = "Urmusic - " + title;
		
		audioElement.play();
		
		helpNav.classList.add("masked");
		// buttonRecord.classList.remove('disabled');
	}
	
	function processAudioFile(soundFile) {
		if(!soundFile.type.match('audio.*')) {
			return;
		}
		
		var reader = new FileReader();
		reader.addEventListener('load', function(e) {
			processAudioDataURL(soundFile.name.substr(0, soundFile.name.lastIndexOf('.')), e.target.result);
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
	
	function addressArray(array, i, outValue) {
		if(i < 0 || i >= array.length) {
			return outValue;
		} else {
			return array[i];
		}
	}
	
	function quadCurve(p0y, cpy, p1y, t) {
		return (1.0 - t) * (1.0 - t) * p0y + 2.0 * (1.0 - t) * t * cpy + t * t * p1y;
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
	
	function freqValue(nind, section) {
		var minDec = section.minDecibels.value;
		
		return Math.max(
			getValue(
				freqData,
				lerp(section.freqStart.value, section.freqEnd.value, nind) * freqData.length,
				section.quadratic,
				minDec) - minDec,
			0) / (section.maxDecibels.value - minDec);
	}
	
	function loop() {
		analyser.smoothingTimeConstant = clamp(settings.smoothingTimeConstant.value, 0.0, 1.0);
		lowAnalyser.smoothingTimeConstant = clamp(settings.advanced.lowpassSmooth, 0.0, 1.0);
		highAnalyser.smoothingTimeConstant = clamp(settings.advanced.highpassSmooth, 0.0, 1.0);
		
		if(!freqData) {
			freqData = new Float32Array(analyser.frequencyBinCount);
			
			if(audioElement.paused) {
				for(var i = 0; i < freqData.length; i++) {
					freqData[i] = Number.MIN_SAFE_INTEGER;
				}
			}
		}
		
		if(!timeData) {
			timeData = new Float32Array(analyser.frequencyBinCount);
			
			if(audioElement.paused) {
				for(var i = 0; i < timeData.length; i++) {
					timeData[i] = 0;
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
			analyser.getFloatTimeDomainData(timeData);
			
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
		frameProps.prettytime = prettyTime(frameProps.time);
		frameProps.prettyduration = prettyTime(frameProps.duration);
		frameProps.imgw = 0;
		frameProps.imgh = 0;
		frameProps.imgr = 0;
		
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
	
	function getFootProps(csize, section, per) {
		var height = Math.pow(freqValue(per, section), section.exponent.value) * section.height.value;
		
		var x = lerp(section.startX.value, section.endX.value, per);
		var y = section.yPos.value;
		
		var polar = section.polar.value;
		if(polar > 0.0) {
			var cosx = Math.cos((x * 0.5 + 0.5) * Math.PI * 2);
			var sinx = Math.sin((x * 0.5 + 0.5) * Math.PI * 2);
			
			var xp = cosx * y;
			var yp = sinx * y;
			
			x = lerp(x * csize, xp * csize, polar);
			y = lerp(y * csize, yp * csize, polar);
		} else {
			x *= csize;
			y *= csize;
		}
		
		return {
			x: x,
			y: y
		};
	}
	
	function getTimeFootProps(csize, section, per) {
		var x = lerp(section.startX, section.endX, per);
		var y = section.yPos;
		
		if(section.polar > 0.0) {
			var cosx = Math.cos((x * 0.5 + 0.5) * Math.PI * 2);
			var sinx = Math.sin((x * 0.5 + 0.5) * Math.PI * 2);
			
			var xp = cosx * y;
			var yp = sinx * y;
			
			x = lerp(x * csize, xp * csize, section.polar);
			y = lerp(y * csize, yp * csize, section.polar);
		} else {
			x *= csize;
			y *= csize;
		}
		
		return {
			x: x,
			y: y
		};
	}
	
	function getProps(csize, section, per) {
		var height = Math.pow(freqValue(per, section), section.exponent.value) * section.height.value;
		
		var x = lerp(section.startX.value, section.endX.value, per);
		var y = section.yPos.value;
		
		var ey = y + section.minHeight.value + height;
		var ex = x;
		
		var polar = section.polar.value;
		if(polar > 0.0) {
			var cosx = Math.cos((x * 0.5 + 0.5) * Math.PI * 2);
			var sinx = Math.sin((x * 0.5 + 0.5) * Math.PI * 2);
			
			var xp = cosx * y;
			var yp = sinx * y;
			var exp = cosx * ey;
			var eyp = sinx * ey;
			
			x = lerp(x * csize, xp * csize, polar);
			y = lerp(y * csize, yp * csize, polar);
			ex = lerp(ex * csize, exp * csize, polar);
			ey = lerp(ey * csize, eyp * csize, polar);
		} else {
			x *= csize;
			y *= csize;
			ex *= csize;
			ey *= csize;
		}
		
		return {
			x: x,
			y: y,
			ex: ex,
			ey: ey
		};
	}
	
	function getTimeProps(csize, section, per) {
		var height = getValue(
								timeData,
								per * timeData.length,
								section.quadratic,
								0);
		var powered = Math.abs(Math.pow(height, section.exponent.value));
		height = (height >= 0 ? powered : -powered) * section.height.value;
		
		var x = lerp(section.startX.value, section.endX.value, per);
		var y = section.yPos.value;
		
		var ey = y + height;
		var ex = x;
		 
		var polar = section.polar.value;
		if(polar > 0.0) {
			var cosx = Math.cos((x * 0.5 + 0.5) * Math.PI * 2);
			var sinx = Math.sin((x * 0.5 + 0.5) * Math.PI * 2);
			
			var xp = cosx * y;
			var yp = sinx * y;
			var exp = cosx * ey;
			var eyp = sinx * ey;
			
			x = lerp(x * csize, xp * csize, polar);
			y = lerp(y * csize, yp * csize, polar);
			ex = lerp(ex * csize, exp * csize, polar);
			ey = lerp(ey * csize, eyp * csize, polar);
		} else {
			x *= csize;
			y *= csize;
			ex *= csize;
			ey *= csize;
		}
		
		return {
			x: x,
			y: y,
			ex: ex,
			ey: ey
		};
	}
	
	var render = (function() {
		var csize = 0;
		var glblscl = 0;
		
		var section = null;
		var sectarg = null;
		var dataCount = 32;
		var glowness = 0;
		var lineWidth = 0;
		
		function renderFreq() {
			dataCount = sectarg.dataCount.value;
			var mode = sectarg.mode;
			
			gtx.strokeStyle = section.color;
			gtx.fillStyle = section.color;
			gtx.lineWidth = (sectarg.lineWidth.value / 100) * csize;
			gtx.shadowColor = section.color;
			gtx.shadowBlur = glowness * glblscl; // Cause for some reasons, it's not scaled by the scale. This comment doesn't make sense.
			
			gtx.lineCap = sectarg.lineCap.name.toLowerCase();
			
			gtx.beginPath();
			for(var i = 0; i < dataCount; i++) {
				if(!sectarg.drawLast && i === dataCount - 1) {
					break;
				}
				
				var per = i / (dataCount - 1);
				
				var p = getProps(csize, sectarg, per);
				
				if(mode == drawMode.LINES || (i == 0 && sectarg.clampShapeToZero)) {
					gtx.moveTo(p.x, p.y);
				}
				
				gtx.lineTo(p.ex, p.ey);
				
				if(i == dataCount - 1 && sectarg.clampShapeToZero) {
					gtx.lineTo(p.x, p.y);
				}
			}
			
			if(sectarg.closeShape && mode !== drawMode.FILL) { // Doesn't affect fill mode
				gtx.closePath();
			}
			
			if(mode === drawMode.FILL) {
				if(sectarg.smartFill) {
					for(var i = dataCount - 1; i >= 0; i--) {
						if(!sectarg.drawLast && i === dataCount - 1) {
							continue;
						}
						
						var per = i / (dataCount - 1);
						var fp = getFootProps(csize, sectarg, per);
						
						gtx.lineTo(fp.x, fp.y);
					}
				}
				
				gtx.fill();
			} else {
				gtx.moveTo(0, 0);
				gtx.stroke();
			}
		};
		
		function renderTimeDom() {
			dataCount = sectarg.dataCount.value;
			var mode = sectarg.mode;
			
			gtx.strokeStyle = section.color;
			gtx.fillStyle = section.color;
			gtx.lineWidth = (sectarg.lineWidth.value / 100) * csize;
			gtx.shadowColor = section.color;
			gtx.shadowBlur = glowness * glblscl; // Cause for some reasons, it's not scaled by the scale. This comment doesn't make sense.
			
			gtx.lineCap = sectarg.lineCap.name.toLowerCase();
			gtx.lineJoin = sectarg.lineJoin.name.toLowerCase();
			
			gtx.beginPath();
			for(var i = 0; i < dataCount; i++) {
				if(!sectarg.drawLast && i === dataCount - 1) {
					break;
				}
				
				var per = i / (dataCount - 1);
				
				var p = getTimeProps(csize, sectarg, per);
				
				if(mode == drawMode.LINES || (i == 0 && sectarg.clampShapeToZero)) {
					gtx.moveTo(p.x, p.y);
				}
				
				gtx.lineTo(p.ex, p.ey);
				
				if(i == dataCount - 1 && sectarg.clampShapeToZero) {
					gtx.lineTo(p.x, p.y);
				}
			}
			
			if(sectarg.closeShape && mode !== drawMode.FILL) { // Doesn't affect fill mode
				gtx.closePath();
			}
			
			if(mode === drawMode.FILL) {
				if(sectarg.smartFill) {
					for(var i = dataCount - 1; i >= 0; i--) {
						if(!sectarg.drawLast && i === dataCount - 1) {
							continue;
						}
						
						var per = i / (dataCount - 1);
						var fp = getTimeFootProps(csize, sectarg, per);
						
						gtx.lineTo(fp.x, fp.y);
					}
				}
				
				gtx.fill();
			} else {
				gtx.moveTo(0, 0);
				gtx.stroke();
			}
		}
		
		function renderImage() {
			gtx.strokeStyle = sectarg.borderColor;
			gtx.fillStyle = section.color;
			gtx.lineWidth = (sectarg.borderSize.value / 100) * csize;
			gtx.shadowColor = section.color;
			gtx.shadowBlur = glowness * glblscl; // Cause for some reasons, it's not scaled by the scale. This comment doesn't make sense.
			gtx.scale(1, -1);
			
			var img = sectarg.image;
			
			var imgBorderRad = sectarg.imageBorderRadius.value * csize;
			if(imgBorderRad !== 0.0) {
				gtx.roundRect(
					-csize/2,
					-csize/2,
					csize,
					csize,
					imgBorderRad);
				gtx.clip();
				
				if(sectarg.opaque) gtx.fill();
				if(sectarg.borderVisible) gtx.stroke();
				
				if(sectarg.imageReady) {
					gtx.drawImage(img,
						-csize/2,
						-csize/2,
						csize,
						csize);
				}
			} else {
				gtx.beginPath();
				gtx.rect(
					-csize/2,
					-csize/2,
					csize,
					csize);
				if(sectarg.opaque) gtx.fill();
				if(sectarg.borderVisible) gtx.stroke();
				
				if(sectarg.imageReady) {
					gtx.drawImage(img,
						-csize/2,
						-csize/2,
						csize,
						csize);
				}
			}
		}
		
		function renderText() {
			var txt = '';
			
			if(!sectarg.text || '' === (txt = sectarg.text.value)) {
				return;
			}
		
			gtx.shadowColor = section.color;
			gtx.shadowBlur = glowness * glblscl;
			gtx.fillStyle = section.color;
			gtx.font = sectarg.fontStyle + ' ' + (sectarg.fontSize.value * csize) + 'px ' + sectarg.fontFamily;
			gtx.textAlign = sectarg.textAlign.name.toLowerCase();
			gtx.textBaseline = sectarg.textBaseline.name.toLowerCase();
			
			gtx.scale(1, -1);
			
			gtx.fillText(txt, 0, 0);
		}
		
		return function() {
			aspect = cvs.width / cvs.height;
			csize = Math.min(cvs.width, cvs.height);
			frameProps.csize = csize;
			
			gtx.clearRect(0, 0, cvs.width, cvs.height);
			
			gtx.fillStyle = settings.backgroundColor;
			gtx.fillRect(0, 0, cvs.width, cvs.height);
			
			gtx.save();
				gtx.translate(cvs.width/2, cvs.height/2);
				gtx.scale(0.5, -0.5);
				
				glblscl = settings.globalScale.value;
				gtx.scale(glblscl, glblscl);
				
				gtx.translate(settings.globalOffsetX.value * csize, settings.globalOffsetY.value * csize);
				gtx.rotate(settings.globalRotation.value * Math.PI / 180);
				
				for(var is = 0; is < settings.sections.length; is++) {
					section = settings.sections[is];
					sectarg = section.target;
					
					if(!section.visible) {
						continue;
					}
					
					if(section.type === sectionType.IMAGE && sectarg.imageReady) {
						frameProps.imgw = sectarg.image.width;
						frameProps.imgh = sectarg.image.height;
						frameProps.imgr = frameProps.imgw / frameProps.imgh;
					} else {
						frameProps.imgw = frameProps.imgh = frameProps.imgr = 0;
					}
					
					glowness = section.glowness.value;
					
					gtx.save();
						gtx.translate(section.posX.value * csize, section.posY.value * csize);
						gtx.rotate(section.rotation.value * Math.PI / 180);
						gtx.scale(section.scaleX.value, section.scaleY.value);
						
						gtx.globalAlpha = section.opacity.value;
						
						if(section.type === sectionType.FREQ) {
							renderFreq();
						} else if(section.type === sectionType.TIME_DOM) {
							renderTimeDom();
						} else if(section.type === sectionType.IMAGE) {
							renderImage();
						} else if(section.type === sectionType.TEXT) {
							renderText();
						}
					gtx.restore();
				}
			gtx.restore();
		}
	})();
	
	function warnIfNotFirefox() {
		if(navigator.userAgent.indexOf('Firefox/') === -1) {
			firefoxIsBetter.style.marginRight = '0px';
		}
	}
	
	function initSoundCloud() {
		SC.initialize({
			client_id: scClientID
		});
		
		var scInput = document.getElementById('soundcloudApp').parentNode.getElementsByClassName('appLinkInput')[0];
		var container = scInput.parentNode.parentNode;
		scInput.addEventListener('change', function() {
			container.classList.add('loading');
			
			SC.resolve(this.value).then(function(s) {
				var xhr = new XMLHttpRequest();
				xhr.onload = function(e) {
					processAudioDataURL(s.title + " (SoundCloud)", e.target.responseURL);
					container.classList.remove('loading');
				};
				xhr.open('GET', s.stream_url + "?client_id="+scClientID);
				xhr.send();
			}, function() {
				container.classList.remove('loading');
			});
		});
	}
	
	function initApp(appIcon) {
		var appDivContainer = document.createElement('div');
		var urlformdiv = document.createElement('div');
		var urlinput = document.createElement('input');
		var loadicon = document.createElement('i');
		
		appDivContainer.classList.add('musicAppIconContainer');
		appDivContainer.appendChild(appIcon);
		
		urlinput.placeholder = "Paste a link...";

		urlformdiv.appendChild(urlinput);
		urlformdiv.appendChild(loadicon);
		
		urlformdiv.classList.add('appLinkForm');
		urlinput.classList.add('appLinkInput');
		
		loadicon.classList.add('loadIcon');
		new Spinner(spinnerOpts).spin(loadicon);
		
		appDivContainer.appendChild(urlformdiv);
		
		appIcon.addEventListener('click', function() {
			appDivContainer.classList.contains('activated') ? appDivContainer.classList.remove('activated') : appDivContainer.classList.add('activated');
		});
		
		return appDivContainer;
	}
	
	function initApps() {
		var apps = [];
		while(musicApps.children.length !== 0) {
			apps.push(initApp(musicApps.removeChild(musicApps.children[0])));
		}
		
		for(var i = 0, l = apps.length; i < l; i++) {
			musicApps.appendChild(apps[i]);
		}
		
		initSoundCloud();
	}
	
	window.addEventListener('keydown', function(e) {
		if(document.activeElement && document.activeElement.tagName === "INPUT") { return; }
		
		if(e.keyCode === 112) { // F1
			e.preventDefault();
			
			for(var i = 0; i < hidableStuff.length; i++) {
				hidableStuff[i].classList.toggle('hidden');
			}
		} else if(audioElement.src) {
			if(e.keyCode === 32) { // Spacebar
				e.preventDefault();
				
				if(audioElement.paused) audioElement.play();
				else audioElement.pause();
			} else if(e.keyCode === 36) { // Home
				audioElement.currentTime = 0;
			} else if(e.keyCode === 37) { // Left
				audioElement.currentTime -= 5;
			} else if(e.keyCode === 39) { // Right
				audioElement.currentTime += 5;
			}
		}
	});
	
	if(!cvs || !gtx || !ctx) {
		alert("Your browser isn't compatible"); 
		throw new Error("Couldn't initialize");
		
		return;
	}
	
	audioSource = ctx.createMediaElementSource(audioElement);
	gainNode = ctx.createGain();
	gainNode.gain.value = 0.8;
	
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
		localStorage.urmusic_volume = gainNode.gain.value;
	} else {
		gainNode.gain.value = localStorage.urmusic_volume;
	}
	
	THEPLAYER.setupPlayer(thePlayer, {
		target: audioElement,
		volume: gainNode.gain.value,
		
		onvolumechange: function(newValue) {
			gainNode.gain.value = newValue;
			localStorage.urmusic_volume = newValue;
		}
	});
	
	audioElement.crossOrigin = "anonymous";
	
	var setNav = document.getElementById('settingsNav');
	var presetMenuOpenCloseBtn = document.getElementById('presetMenuOpenCloseBtn');
	var presetMenu = document.getElementById('settingsPresetsMenu');
	var allButtons = document.getElementsByClassName('button');
	
	document.getElementById('hambParent').addEventListener('click', function(e) {
		setNav.classList.contains('activated') ? setNav.classList.remove('activated') : setNav.classList.add('activated');
		
		if(!setNav.classList.contains('activated')) {
			presetMenu.classList.remove('opened');
			presetMenuOpenCloseBtn.classList.remove('opened');
		}
	});
	
	recorder.addEventListener('dataavailable', function(e) {
		downloader.href = URL.createObjectURL(e.data);
		downloader.download = "urmusic recording.webm";
		
		downloader.click();
		
		buttonRecord.innerHTML = "Record a video";
		buttonRecord.classList.remove('disabled');
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
	bottomMenuOpener.addEventListener('click', function() {
		this.classList.toggle('closeMode');
		thePlayer.classList.toggle('bottomMenuOpened');
		bottomMenu.classList.toggle('opened');
	});
	buttonRecord.addEventListener('click', function() {
		if(this.classList.contains('disabled')) return;
		
		if(recorder.state === 'recording') {
			recorder.stop();
			
			return;
		}
		
		// Start recording
		audioElement.currentTime = 0;
		// recorder.start();
		
		this.innerHTML = "Stop the record";
	});
	
	for(var i = 0; i < allButtons.length; i++) {
		var b = allButtons[i];
		
		b.addEventListener('mousedown', function() {
			this.classList.add('pushed');
		});
		b.addEventListener('mouseup', function() {
			this.classList.remove('pushed');
		});
	}
	
	audioElement.addEventListener('ended', function() {
		if(recorder.state === 'recording') recorder.stop();
	});
	audioElement.addEventListener('pause', function() {
		if(recorder.state === 'recording') recorder.pause();
	});
	audioElement.addEventListener('play', function() {
		if(recorder.state === 'paused') recorder.resume();
	});
	
	lowpass.connect(lowAnalyser);
	highpass.connect(highAnalyser);
	
	audioSource.connect(gainNode);
	audioSource.connect(analyser);
	audioSource.connect(lowpass);
	audioSource.connect(highpass);
	gainNode.connect(ctx.destination);
	
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
	
	initApps();
	
	console.log(
		" _    _ ________     __  _ \n"
	+	"| |  | |  ____\\ \\   / / | |\t" +	"Hey you! This app is highly customizable through the JavaScript\n"
	+	"| |__| | |__   \\ \\_/ /  | |\t" +	"console too! Have fun, and try not to broke everything :p!\n"
	+	"|  __  |  __|   \\   /   | |\t" +	"\n"
	+	"| |  | | |____   | |    |_|\t" +	"Urmusic V1.4.3\n"
	+	"|_|  |_|______|  |_|    (_)\t" +	"By Nasso (https://nasso.github.io/)\n\n");
	
	loadPreset();
	
	loop();
	
	var relec = null;
	if(window.require && (relec = window.require('electron'))) {
		var args = relec.remote.process.argv;
		if(args[1]) {
			var title = args[1];
			title = title.replace(/\\/g, '/');
			title = title.substr(title.lastIndexOf('/') + 1, title.lastIndexOf('.'));
			
			processAudioDataURL(title, args[1]);
		}
	} else {
		warnIfNotFirefox();
	}
});
