from neo_pipeline.ingestor import Ingestor
from neo_pipeline.transform import Transformer


class Runner:
    def runner(self, start_date, end_date):
        ingest = Ingestor()
        ingest._get_data_range(start_date_str=start_date,
                               end_date_str=end_date)

        transform = Transformer()
        outcome = transform._transform(start_date)
        return outcome
