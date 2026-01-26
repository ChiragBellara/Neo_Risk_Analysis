import requests
import time
import json
import os
from datetime import timedelta, datetime
from neo_pipeline import config
import neo_pipeline.logging as logging

logger = logging.setup_logger('ingestion_pipeline')


class Ingestor:
    def __init__(self) -> None:
        self.base_url = config.NASA_FEED_URL
        self.base_dir = config.RAW_DIR
        os.makedirs(self.base_dir, exist_ok=True)

    def _save_to_local(self, data, start_date):
        """Saves the given JSON data to a file"""
        file_name = f"neo_extract_{start_date}.json"
        file_path = os.path.join(self.base_dir, file_name)
        with open(file_path, 'w') as file:
            json.dump(data, file)
        logger.info(f"Successfully saved: {file_path}")

    def _get_data_range(self, start_date_str=None, end_date_str=None):
        """Formats the date range for which the data is to be fetched"""
        today = datetime.today()
        # If start_date_str is None, then we assign start_date as today's date - 7 days
        # If end_date_str is None, then we assign end_date as today's date
        start_date = datetime.strptime(
            start_date_str, '%Y-%m-%d') if start_date_str else today - timedelta(days=6)
        end_date = datetime.strptime(
            end_date_str, '%Y-%m-%d') if end_date_str else today
        logger.info(f"Start Date: {start_date}; End Date: {end_date}")

        current_start = start_date
        while current_start <= end_date:
            current_end = min(current_start + timedelta(days=6), end_date)
            self._fetch_with_retries(current_start.strftime(
                '%Y-%m-%d'), current_end.strftime('%Y-%m-%d'))
            current_start = current_end + timedelta(days=1)

    def _fetch_with_retries(self, start_date, end_date, retries=3):
        """Fetches data from the NASA API with basic retry logic"""
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'api_key': config.NASA_API_KEY
        }

        for i in range(retries):
            response = requests.get(self.base_url, params=params)
            if response.status_code == 200:
                self._save_to_local(response.json(), start_date)
                return
            elif response.status_code == 429:
                logger.warning(
                    f"Rate Limit hit. Sleeping for {60 * (i+1)} seconds.")
                time.sleep(60 * (i+1))
            else:
                logger.error(f"Error {response.status_code}: {response.text}")
                break
