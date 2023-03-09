#!/bin/sh

set -e

cd l1 && yarn

cd ../l2 && yarn

cd ../l1 && yarn deploy
cd ../l2 && yarn deploy

yarn hardhat run scripts/generate-message.ts