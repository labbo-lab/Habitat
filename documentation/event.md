# Event

## `fireEvent(name, options = {})`

Fire an event.

```javascript
fireEvent("click")
```

```javascript
fireEvent("click", { target: $("button") })
```

## `on(name, func, options = {})`

Add an event listener.

```javascript
on("click", () => print("You clicked"))
```
