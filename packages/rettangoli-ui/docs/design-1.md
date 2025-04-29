
# Draft

Problem:

html per se does not support rich props. It cannot do this:

```html
<rtgl-sidebar items=[...]>
</rtgl-sidebar>
```

Especially when the props can be rich, such as sidebar header, footer, item groups etc...

There are 2 work arounds.

1 which is used by most web component UI libraries:

```html
<rtgl-sidebar>
  <rtgl-sidebar-header title="..." icon="..." href="...">
  </rtgl-sidebar-header>
  <rtgl-sidebar-body>
    <rtgl-sidebar-group title="primitives">
      <rtgl-sidebar-group-item title="..." href="...">
      </rtgl-sidebar-group-item>
    </rtgl-sidebar-group>
    <rtgl-sidebar-group title="components">
      <rtgl-sidebar-group-item title="..." href="...">
      </rtgl-sidebar-group-item>
    </rtgl-sidebar-group>
  </rtgl-sidebar-body>
  <rtgl-sidebar-footer>
  </rtgl-sidebar-footer>
</rtgl-sidebar>
```

The advange is that the styling is consistent.
It is also SEO or human readable friendly.

But this is really verbose:

* it is verbose
* user has to know this structure, and all those sub components
* This is creating multiple web compoents, need to register all of them

Because of those reasons I don't like it.

Option 2

```html
<rtgl-sidebar items='[{"title": "..."}] | escaped'>
</rtgl-sidebar>
```


We provide an escaped version of the json data as a string, and parse it inside the web component.
This makes it simpler for me as everything can be passed with a json.

The disadvantage is that this is not standards html, and mostly SEO unfriendly
Developers are also unlikely to write the payload manaully like that. but works if it is generated.

Option 3


```js

html`
  <rtgl-sidebar .items=${[{"title": "..."}]}'>
  </rtgl-sidebar>
`
```


Using uhtml, we can pass props to the web component easily, and not need to manully escape.
The main disadvantage is that this works only in javascript. so it will be very SEO unfriendly.

There is actually a solution for SEO, which is to SSR the content, which is done at build time and not runtime.

So, if we use this with SSR, we have resolved most disadvantages. But is adds some complexity to handle the SSR.

Also, we still cannot write html manually, need to use uhtml and js.


## Decision

Prioritize option 3 as it is mostly feature rich, and sacrificies SEO and html without javascript.

For environments that can't use js, can add additional support for option 2.


```html
    <rtgl-view h="f" w="272" bwr="xs">
      <rtgl-view p="l">
        <rtgl-text s="h4" c="primary">Rettangoli test suite</rtgl-text>
      </rtgl-view>
      <rtgl-view w="f" p="l" g="xs">
        {% for section in sections %}
        <a style="display: contents; text-decoration: none; color: inherit;" href="/{{ section.title | slug }}">
          <rtgl-view h="36" av="c" ph="m" w="f" h-bgc="mu" br="l"
            bgc="{% if currentSection.title == section.title %}mu{% else %}bg{% endif %}" cur="p">
            <rtgl-text s="sm">{{ section.title }}</rtgl-text>
          </rtgl-view>
        </a>
        {% endfor %}
      </rtgl-view>
    </rtgl-view>
```
