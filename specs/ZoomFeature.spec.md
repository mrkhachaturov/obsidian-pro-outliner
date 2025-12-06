# Should zoom in

- applyState:

```md
text

# 1

text

## 1.1|

text

# 2

text
```

- execute: `obsidian-zoom:zoom-in`
- assertState:

```md
text #hidden
 #hidden
# 1 #hidden
 #hidden
text #hidden
 #hidden
## 1.1|

text

# 2 #hidden
 #hidden
text #hidden
```

# Should zoom out

- applyState:

```md
text

# 1

text

## 1.1|

text

# 2

text
```

- execute: `obsidian-zoom:zoom-in`
- execute: `obsidian-zoom:zoom-out`
- assertState:

```md
text

# 1

text

## 1.1|

text

# 2

text
```

# Should zoom out one level to parent

- applyState:

```md
text

# 1

text

## 1.1

text

### 1.1.1|

text

# 2

text
```

- execute: `obsidian-zoom:zoom-in`
- execute: `obsidian-zoom:zoom-out-one-level`
- assertState:

```md
text #hidden
 #hidden
# 1 #hidden
 #hidden
text #hidden
 #hidden
## 1.1|

text

### 1.1.1

text

# 2 #hidden
 #hidden
text #hidden
```

# Should zoom out one level to document when at top level

- applyState:

```md
text

# 1|

text

# 2

text
```

- execute: `obsidian-zoom:zoom-in`
- execute: `obsidian-zoom:zoom-out-one-level`
- assertState:

```md
text

# 1|

text

# 2

text
```
