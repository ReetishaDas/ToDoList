//jshint esversion:6
//WITH MONGOOSE
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require("mongoose");
const { name } = require("ejs");

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//Setting up connection
main().catch((err) => console.log("Mongo Server Not Connected"));

async function main() {
  const url = "mongodb://127.0.0.1:27017";
  const dbPath = "/todolistDB";
  await mongoose.connect(url + dbPath, {
    useNewUrlParser: true,
  });

  //----------Item Schema-------------
  const itemSchema = mongoose.Schema({
    name: String
  });
  const Item = mongoose.model("Item", itemSchema);

  //creating data for DEFAULT ITEMS
  const task1 = new Item({
    name: "Buy Food"
  });
  const task2 = new Item({
    name: "Cook Food"
  });
  const task3 = new Item({
    name: "Eat Food"
  });
  const defaultItems = [task1, task2, task3];

    //----------List Schema-------------
  const listSchema = mongoose.Schema({
    name: String,
    items: [itemSchema]
  });
  const List = mongoose.model("List", listSchema);

  //----------Home TodoList Page Routing---------------
  app.get("/", function (req, res) {
    //finding items if any in default db and send it to our list
    Item.find({}).then(function (foundItems) {
      if (foundItems.length === 0) {
        //Insertion in Mongo
        Item.insertMany(defaultItems).then(function () {
          console.log("Successfully Inserted Default Items");
        }).catch(function (err) {
          console.log("ERROR\n\n", err);
        });
        res.redirect("/"); //after redirecting back to the same route, directly falls to ELSE
      } else {
        res.render("list", { listTitle: "Today", newListItems: foundItems });
      }
    }).catch(function (err) {
      console.log("Error Finding Default Items\n\n", err);
    });
  });

    //----------Custom TodoList Page Routing---------------
  app.get("/:customListName", function(req,res){
    const customListName = _.capitalize(req.params.customListName);
    List.findOne({name: customListName}).then(function(foundList){
      if(!foundList){
        //create a new list
        const list = new List ({
          name : customListName,
          items : defaultItems
        });
        list.save();
        res.redirect("/"+customListName);
      }else{
        res.render("list", ({ listTitle: foundList.name, newListItems: foundList.items }));
      }
    }).catch(function(err){
        console.log(err);
    });
  
  });

    //----------Adding a new TodoItem---------------
  app.post("/", function (req, res) {
    const itemName = req.body.newItem; //from postreq in html
    const listName = req.body.list;
    const item = new Item({
      name: itemName
    }); //inserting it in new mongo doc
    if(listName==="Today"){
      item.save();
      res.redirect("/"); //redirects to home route after adding new item in db  
    }else{
      List.findOne({name: listName}).then(function(foundList){
        foundList.items.push(item);
        foundList.save();
        res.redirect("/"+listName);
      }).catch(function(err){
        console.log(err);
      });
    }
  });

    //----------Deleting an item from TodoList---------------
  app.post("/delete", function(req,res){
    const checkedID = req.body.checkedItem;
    const checkListName = req.body.listName;
    if(checkListName==="Today"){
      Item.findByIdAndRemove(checkedID).then(function(){
        console.log("ID Item Removed Successfully");
        res.redirect("/");
      }).catch(function(err){
        console.log("Couldnt Find ID. Error Occurred");
      });
    }else{
      //$pull removes from an existing array all the values mentioned in the condition
      //find the list name, pull from items where id = checkedid
      List.findOneAndUpdate({name: checkListName},{$pull: {items: {_id:checkedID}}}).then(
        function(){
          res.redirect("/"+checkListName);
        }
      ).catch(function(err){
        console.log(err);
      });
    }
  });

  app.listen(3060, function () {
    console.log("Server started on port 3060");
  });

}


