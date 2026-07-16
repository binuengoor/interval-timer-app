# Use an official lightweight Nginx image
FROM nginx:alpine

# Copy the static website files to the Nginx html directory
COPY index.html style.css script.js /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets/

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]