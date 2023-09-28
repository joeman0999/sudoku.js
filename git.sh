#/bin/sh
git remote add origin https://github.com/joeman0999/sudoku.js.git

# Fetch the newest code
git fetch origin master

# Hard reset
git reset --hard origin/master

# Force pull
git pull origin master --force