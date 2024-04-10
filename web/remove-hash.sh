#!/bin/bash

# Navigate to the directory containing the built files.
# Update this path according to where your files are located.
cd dist

# Loop through .js and .css files with a hash in the filename.
for file in $(ls | egrep '\.(js|css)$'); do
  # Use a regex to capture the filename without the hash.
  if [[ $file =~ ^(.+)\.[0-9a-f]{8}\.(js|css)$ ]]; then
    # Construct the new filename without the hash.
    newname="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}"
    echo "Renaming $file to $newname"
    # Rename the file.
    mv "$file" "$newname"
  fi
done