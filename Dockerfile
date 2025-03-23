FROM oven/bun
COPY . .
RUN apt-get -y update
RUN apt-get -y install git
RUN bun install

# Declare a build argument for the Git commit hash
ARG GIT_COMMIT
ARG GIT_VERSION
ARG GIT_DATE

# Set an environment variable inside the container
ENV GIT_COMMIT=${GIT_COMMIT}
ENV GIT_VERSION=${GIT_VERSION}
ENV GIT_DATE=${GIT_DATE}

# https://github.com/opencontainers/image-spec/blob/main/annotations.md
LABEL org.opencontainers.image.revision=$GIT_COMMIT
LABEL org.opencontainers.image.version=$GIT_VERSION
LABEL org.opencontainers.image.created=$GIT_DATE

ENTRYPOINT [ "bun", "run", "start" ]