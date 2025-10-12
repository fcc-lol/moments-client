#!/bin/bash
# Script to enable Apache proxy modules
# Run this on the server hosting moments.fcc.lol

echo "Enabling Apache proxy modules..."

# Enable required modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_connect
sudo a2enmod headers

# Restart Apache to apply changes
sudo systemctl restart apache2

echo "Done! Proxy modules enabled."
echo "Testing Apache configuration..."
sudo apache2ctl configtest

