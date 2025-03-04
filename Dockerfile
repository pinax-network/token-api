FROM oven/bun
COPY . .
RUN apt-get -y update
RUN apt-get -y install git
RUN bun install

# Declare a build argument for the Git commit hash
ARG GIT_COMMIT

# Set an environment variable inside the container
ENV GIT_COMMIT=${GIT_COMMIT}

ENTRYPOINT [ "bun", "run", "start" ]