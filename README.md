# SLBMS - Bookmarks viewer 🔖

<img style="border-radius: 10px;" src="https://i.imgur.com/QXHIrjr.gif"/>

<p style="text-align:center;">SLBMS is a simple nodejs bookmarks viewer that lets you explore a backup of your browser's bookmarks json file in various ways in a friendly manner.</p>

## 🔧 Install
```
$ git clone https://github.com/Super-Lovers/slbmsjs-cli.git
```
```
$ cd slbmsjs-cli
```
```
$ npm i [-g]
```
## 🎈 Usage

Before you can start using the application, you have to go to its root directory (``npm list -g | head -1`` to get path to npm packages, then enter node_modules and then enter this package's folder) and create a "bookmarks" folder where you have to put your respective browser's html JSON file of the bookmarks that you export. So far I have tested that it works with Chrome and Firefox (you can also use more than one bookmarks backup file). Your folder structure should look like this:

<img style="float:left;" src="https://i.imgur.com/9IeASY8.png"/>

After you have done that you can start the application:
```
$ slbms
```

After that you will get the following screen:

<img style="float:left;" src="https://i.imgur.com/VIAChBP.png"/>

At that point, the bookmarks files will be imported into the application and are ready for use. There are three ways to currently browse your bookmarks:

* Group - finds all bookmarks that belong to a specific domain and groups and sorts them together based on the number of occurrences.

  <img style="float:left;" src="https://i.imgur.com/JS8QPp1.png"/>

* Sorting - Sorts all the bookmarks based on its date of creation, so from newest or oldest.

  <img style="float:left;" src="https://i.imgur.com/HiiS2ja.png"/>

* Keywords - Returns the best matching results sorted by accuracy.

  <img style="float:left;" src="https://i.imgur.com/BFH0Yk2.png"/>

Once you hover a bookmark entry you like, you can press enter and it will automatically try to open it using your default browser.

## 🎁 Contribution

I'm an inexperienced Node.js developer, so I would be happy to receive any feedback or help in making this application better, because I fear my source code would stink a lot for any experienced developers! It is my first node.js package and I wanted to try out what it is like for myself to make a CLI. Feel free to fork it!
