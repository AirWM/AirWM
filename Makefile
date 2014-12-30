.PHONY:run
run: lib/airwm.js
	Xephyr :1 -ac -screen 800x600 &
	DISPLAY=:1 node lib/airwm.js &

kill:
	killall Xephyr
