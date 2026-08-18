#!/bin/bash
echo "Killing all http-servers before running script"

# Kill all running http-server processes
pkill http-server
echo "Killed http-server starting fresh"
echo "Sleeping 10 seconds before running the B Zero X webpages"
sleep 10

echo "Launching http-server"
gnome-terminal -- bash -c "./z_runTheHTTP_Server.sh; exec bash"
sleep 3
echo "HTTP server launched"
sleep 2
# Open Firefox with the specified URL
google-chrome --new-window http://127.0.0.1:8080/index.html &
echo "webpage running now dont exit script unless u want webpage to exit"
sleep 10
echo "webpage running now dont exit script unless u want webpage to exit"
while true; do
    # Prompt the user for input
    read -p "Type 'exit' to quit: " user_input
    
    # Check if the input is 'exit'
    if [[ "$user_input" == "exit" ]]; then
        echo "Exiting..."
        break
    fi
done
