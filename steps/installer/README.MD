
# How does this feature stuff work?
 
 - We generate a tree using the features and files.
 - Top level overrides bottom level.
 - Features are standalone and are accessed by the given renderer.


# How do we merge the features?

- We have a secondary file or class that defines the merge behaviour.
- It is also possible that features are not merged and seen as individual features.


# How does this renderer stuff work

- We ingest all the given features
- We warn/fail on unsupported features, based on severity.
- Features are renderered, producing a result, based on the given features. 

