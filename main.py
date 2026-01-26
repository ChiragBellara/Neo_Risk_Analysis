from src.neo_pipeline.ingestor import Ingestor
from src.neo_pipeline.transform import Transformer

ingest = Ingestor()
ingest._get_data_range()

transform = Transformer()
transform._transform()
