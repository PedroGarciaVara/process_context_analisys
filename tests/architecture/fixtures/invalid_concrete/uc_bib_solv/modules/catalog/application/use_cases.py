from uc_bib_solv.modules.catalog.adapters.outbound.persistence import PostgresCatalogRepository


def load_catalog():
    return PostgresCatalogRepository()
