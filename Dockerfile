FROM node:20-slim

EXPOSE 8000
MAINTAINER Jean-Christophe Hoelt <hoelt@fovea.cc>

# Create 'app' user
RUN useradd app -d /home/app
WORKDIR /home/app/code

# Install NPM packages
COPY package.json /home/app/code/package.json
RUN npm install

# Copy app source files
COPY tsconfig.json Makefile index.ts /home/app/code/
COPY tests /home/app/code/tests
COPY src /home/app/code/src
RUN chown -R app /home/app

# Run and build as "app" user
USER app
RUN npm run build

CMD npm run start:ts
