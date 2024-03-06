#!/bin/bash

# Navigate to your application directoryy
cd /var/www/html/eezly-grocery-nodeJS-api
sudo /usr/bin/chmod -R 755 /var/www/html/eezly-grocery-nodeJS-api/scripts/

# Restart all services managed by pm2
/usr/local/bin/pm2 restart all

