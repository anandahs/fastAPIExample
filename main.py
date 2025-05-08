from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uvicorn


app = FastAPI()

@app.get("/")
def read_root():
    return {"Message": "Welcome to FastAPI!"}

class Item(BaseModel):
    id: int
    name : str 
    origin: str

Items: List[Item] = []

@app.get("/items")
def get_items():
    return Items

@app.post("/items")
def create_item(item: Item):
    Items.append(item)
    return item

@app.put("/items/{item_id}")
def update_item(item_id: int, item: Item):
    for i, existing_item in enumerate(Items):
        if existing_item.id == item_id:
            Items[i] = item
            return item
    return {"Error": "Item not found"}

@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    for i, existing_item in enumerate(Items):
        if existing_item.id == item_id:
            del Items[i]
            return {"message": "Item deleted"}
    return {"Error": "Item not found"}

def main():
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)


if __name__ == "__main__":
    main()