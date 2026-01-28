import os
from dotenv import load_dotenv

# This line loads variables from the .env file into the environment
load_dotenv()

# Access the URI using the os module
MONGO_URI = os.getenv("MONGO_URI")

# Use MONGO_URI to establish the pymongo connection
# ...