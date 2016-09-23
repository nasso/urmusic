var THEPLAYER = {};

THEPLAYER.setupPlayer = (function(){
	var playerCode =
		'<div class="timeStuff"><span class="currentSlashEndC"></span><span class="currentSlashEndS">/</span><span class="currentSlashEndE"></span></div>' +
		'<div class="container">' +
			'<i class="fa fa-play w3-large playBtn"></i>' +
			'<i class="fa fa-pause w3-large pauseBtn"></i>' +
			'<div class="slider songPosition"><span class="sliderFiller"></span><i class="sliderDot"></i><span class="sliderHitbox"></span></div>' +
			'<div class="volumeStuff">' +
				'<i class="fa fa-volume-up w3-large volumeIcon"></i>' +
				'<div class="slider volume"><span class="sliderFiller"></span><i class="sliderDot"></i><span class="sliderHitbox"></span></div>' +
			'</div>' +
		'</div>';

	var isLeftDown = false;
	var pressedSlider = null;
	window.addEventListener('mousedown', function(e) {
		if(e.button === 0) {
			isLeftDown = true;
			
			if(pressedSlider) {
				var value = Math.min(Math.max(e.clientX - pressedSlider.slider.getBoundingClientRect().left, 0) / pressedSlider.slider.clientWidth, 1);
				
				if(!pressedSlider.ondragging || pressedSlider.ondragging(value)) {
					pressedSlider.dot.style.left = pressedSlider.filler.style.width = (value * 100)+'%';
				}
			}
		}
	}, false);
	window.addEventListener('mouseup', function(e) {
		if(e.button === 0) {
			isLeftDown = false;
			
			if(pressedSlider) {
				if(pressedSlider.ondragged) pressedSlider.ondragged();
			}
			
			pressedSlider = null;
		}
	});
	window.addEventListener('mousemove', function(e) {
		if(isLeftDown && pressedSlider) {
			var value = Math.min(Math.max(e.clientX - pressedSlider.slider.getBoundingClientRect().left, 0) / pressedSlider.slider.clientWidth, 1);
			
			if(!pressedSlider.ondragging || pressedSlider.ondragging(value)) {
				pressedSlider.dot.style.left = pressedSlider.filler.style.width = (value * 100)+'%';
			}
		}
	});
	
	function setupSlider(slider, dot, filler, ondragging, ondragged, defaultVal) {
		var hitbox = slider.getElementsByClassName('sliderHitbox')[0];
		var sldr = {
			slider: slider,
			dot: dot,
			filler: filler,
			ondragging: ondragging,
			ondragged: ondragged
		};
		
		hitbox.addEventListener('mousedown', function(e) {
			pressedSlider = sldr;
		}, false);
		
		if(typeof defaultVal === 'number') {
			dot.style.left = filler.style.width = (defaultVal * 100)+'%';
		}
	}
	
	function prettyTime(s) {
		s = s || 0;
		
		var seconds = (s % 60) | 0;
		var minutes = (s / 60 % 60) | 0;
		var hours = (s / 3600) | 0;
		
		if(hours) return hours+':'+('0'+minutes).substr(-2)+':'+('0'+seconds).substr(-2);
		else return minutes+':'+('0'+seconds).substr(-2);
	}
	
	return function(p, s) {
		if(!s.target) return;
		var target = s.target;
		
		p.classList.add('paused');
		p.innerHTML = playerCode;
		
		var currentTimeLabel = p.getElementsByClassName('currentSlashEndC')[0];
		var endTimeLabel = p.getElementsByClassName('currentSlashEndE')[0];
		var playBtn = p.getElementsByClassName('playBtn')[0];
		var pauseBtn = p.getElementsByClassName('pauseBtn')[0];
		var songPosition = p.getElementsByClassName('songPosition')[0];
		var volumeSlider = p.getElementsByClassName('volume')[0];
		var songPositionDot = songPosition.getElementsByClassName('sliderDot')[0];
		var volumeSliderDot = volumeSlider.getElementsByClassName('sliderDot')[0];
		var songPositionFiller = songPosition.getElementsByClassName('sliderFiller')[0];
		var volumeSliderFiller = volumeSlider.getElementsByClassName('sliderFiller')[0];
		
		var dontUpdateStuff = false;
		
		target.addEventListener('pause', function() {
			if(!dontUpdateStuff) p.classList.add('paused');
		});
		target.addEventListener('play', function() {
			if(!dontUpdateStuff) p.classList.remove('paused');
		});
		target.addEventListener('timeupdate', function() {
			if(!dontUpdateStuff) songPositionFiller.style.width = songPositionDot.style.left = (target.currentTime / target.duration * 100) + '%';
			
			currentTimeLabel.innerHTML = prettyTime(target.currentTime);
			endTimeLabel.innerHTML = prettyTime(target.duration);
		});
		
		setupSlider(songPosition, songPositionDot, songPositionFiller, function(newValue) {
			dontUpdateStuff = true;
			if(!target.paused) target.pause();
			if(target.duration) target.currentTime = newValue * target.duration;
			
			return !Number.isNaN(target.duration);
		}, function() {
			if(Number.isNaN(target.duration)) return;
			
			target.play();
			dontUpdateStuff = false;
		});
		
		setupSlider(volumeSlider, volumeSliderDot, volumeSliderFiller, function(newVal) {
			if(s.onvolumechange) {
				s.onvolumechange(newVal);
			} else {
				target.volume = newVal;
			}
			
			return true;
		}, null, s.volume);
		
		currentTimeLabel.innerHTML = prettyTime(target.currentTime);
		endTimeLabel.innerHTML = prettyTime(target.duration);
		
		playBtn.addEventListener('click', function() { target.src && target.play(); });
		pauseBtn.addEventListener('click', function() { target.pause(); });
	}
})();

window.addEventListener('load', function() {
	var players = document.getElementsByClassName('aPlayer');
	
	for(var i = 0; i < players.length; i++) {
		var p = players[i];
		if(p.dataset.autoload) setupPlayer(p, {
			target: document.getElementById(p.dataset)
		});
	}
	
	// style
	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.aPlayer *{user-select:none;-o-user-select:none;-moz-user-select:none;-webkit-user-select:none;display:inline-block;color:#fff}.aPlayer{text-align:center;background:0 0}.aPlayer .timeStuff{display:inline-block;width:100%;height:48px;text-align:center;position:relative;top:32px;background:#111;z-index:10}.aPlayer .timeStuff *{margin:0 16px;position:relative;z-index:20}.aPlayer .timeStuff .currentSlashEndS{font-size:1.2em}.aPlayer .container{text-align:left;position:relative;background:0 0;width:100%;height:32px!important;z-index:15}.aPlayer .container .playBtn,.aPlayer .pauseBtn,.aPlayer .volumeIcon{width:32px;height:32px;line-height:32px;vertical-align:middle;text-align:center;margin:0 4px}.aPlayer .container .pauseBtn,.aPlayer .playBtn{transition:transform .5s;-o-transition:transform .5s;-moz-transition:transform .5s;-webkit-transition:transform .5s}.aPlayer .container .pauseBtn{margin:0 0 0 -36px;backface-visibility:hidden;transform:rotateX(0);-o-transform:rotateX(0);-moz-transform:rotateX(0);-webkit-transform:rotateX(0)}.aPlayer .container .playBtn{backface-visibility:hidden;transform:rotateX(180deg);-o-transform:rotateX(180deg);-moz-transform:rotateX(180deg);-webkit-transform:rotateX(180deg)}.aPlayer.paused .container .pauseBtn{transform:rotateX(180deg);-o-transform:rotateX(180deg);-moz-transform:rotateX(180deg);-webkit-transform:rotateX(180deg)}.aPlayer.paused .container .playBtn{transform:rotateX(0);-o-transform:rotateX(0);-moz-transform:rotateX(0);-webkit-transform:rotateX(0)}.aPlayer .container .slider{height:2px;background:#222;margin:0 4px;position:absolute;top:50%;transform:translateY(-50%);-o-transform:translateY(-50%);-moz-transform:translateY(-50%);-webkit-transform:translateY(-50%)}.aPlayer .container .slider .sliderDot{background:#fff;width:12px;height:12px;border-radius:6px;position:absolute;top:-5px;left:0;transform:translateX(-50%);-o-transform:translateX(-50%);-moz-transform:translateX(-50%);-webkit-transform:translateX(-50%)}.aPlayer .container .slider .sliderFiller{background:#fff;height:2px;width:0;position:absolute}.aPlayer .container .slider .sliderHitbox{display:inline-block;width:calc(100% + 12px);width:-o-calc(100% + 12px);width:-moz-calc(100% + 12px);width:-webkit-calc(100% + 12px);height:12px;position:absolute;top:-5px;left:-6px}.aPlayer .container .slider.songPosition{width:calc(100% - 164px);width:-o-calc(100% - 164px);width:-moz-calc(100% - 164px);width:-webkit-calc(100% - 164px)}.aPlayer .container .slider.volume{width:calc(100% - 54px);width:-o-calc(100% - 54px);width:-moz-calc(100% - 54px);width:-webkit-calc(100% - 54px)}.aPlayer .container .volumeStuff{position:relative;float:right;width:120px}';
	
	document.getElementsByTagName('head')[0].appendChild(style);
});
