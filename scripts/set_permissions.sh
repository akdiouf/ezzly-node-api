#!/bin/bash

# Navigate to your application directory
cd /var/www/html/eezly-grocery-nodeJS-api

# Change ownership to www-data user and group
sudo /bin/chown -R www-data:www-data .

# Set secure permissions for files and directories
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;

# You might need to adjust the above commands based on your app's structure

