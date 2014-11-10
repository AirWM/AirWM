.PHONY:run
run: airwm.js
	Xephyr :1 -ac -screen 800x600 &
	DISPLAY=:1 node airwm.js &
	DISPLAY=:1 xplanet

kill:
	killall Xephyr
