# running official node image
FROM node:18

# set working directory
WORKDIR /usr/src/app

# copying all the files from current directory to working dir in image
COPY package*.json ./

# installing dependencies
RUN npm install

# copying remaining app files
COPY . .

# exposing port for container
EXPOSE 3000

# command to run app
CMD ["node", "app.js"]
