# Inside scripts/restore_permissions.sh
if ! /bin/chmod +x /var/www/html/eezly-grocery-nodeJS-api/scripts/* 2>> /tmp/restore_permissions_error.log; then
    echo "Failed to restore permissions. See /tmp/restore_permissions_error.log for details."
    exit 1
fi
