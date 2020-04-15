let app = new Vue({
  el: '#app',
  data: {
    name: 'wj',
    age: 11,
    hl: '<span style="color: #f00">123</span>',
    books: [{title: 'java'}, {title: 'javascript'}, {title: 'dart'}]
  },
  methods: {
    submit() {
      // console.log('hello', this.name);
      // this.hl = '<span style="color: #f00">456</span>'
      this.name = 'wjwj'

      this.books[0].title = 'javajava';
    }
  },
  watch: {
    // 如果 `question` 发生改变，这个函数就会运行
    name: function (newValue, oldValue) {
      console.log(newValue, oldValue);
    }
  },
});