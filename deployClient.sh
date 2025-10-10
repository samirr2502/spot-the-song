#!/bin/bash

while getopts k:h:s: flag
do
    case "${flag}" in
        k) key=${OPTARG};;
        h) hostname=${OPTARG};;
    esac
done

if [[ -z "$key" || -z "$hostname" ]]; then
    printf "\nMissing required parameter.\n"
    printf "  syntax: deployService.sh -k <pem key file> -h <hostname>\n\n"
    exit 1
fi
service="spot"

printf "\n----> Deploying $service to $hostname with $key\n"

# Step 1
printf "\n----> Build the distribution package\n"
npm run build
echo "{\"version\":\"$(date +"%Y%m%d.%H%M%S")\" }" > dist/version.json

# Step 2
printf "\n----> Clearing out previous distribution on the target\n"
ssh -i "$key" ec2-user@$hostname << ENDSSH
rm -rf public_html/services/${service}
mkdir -p public_html/services/${service}
ENDSSH

# Step 3
printf "\n----> Copy the distribution package to the target\n"
scp -r -i "$key" dist/* ec2-user@$hostname:public_html/services/$service
printf "\n----> Copy the distribution package from target to pointed dir\n"
scp -r -i "$key" dist/* ec2-user@$hostname:../../var/www/html/$service

# Step 4
printf "\n----> Removing local copy of the distribution package\n"
rm -rf dist
