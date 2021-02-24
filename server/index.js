const express = require('express')
const app = express()
const port = 5000

const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

const config = require('./config/key')

const { auth } = require('./middleware/auth')
const { User } = require('./models/Users')

// aplication/x-www-form-urlencoded 의 컨텐츠 타입의 post 방식 파싱을 위함
app.use(bodyParser.urlencoded({ extended: true }))

// application/json 파싱을 위함
app.use(bodyParser.json())

app.use(cookieParser())

mongoose.connect(config.mongoURI,
    { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false })
    .then(() => console.log('MongoDB Connected...')).catch(err => console.log(err))

app.get('/', (req, res) => res.send('Hello World!~~ 안녕하세요!'))


app.post('/temp', (req, res) => {
    res.send('Success!')
})

app.post('/api/user/register', (req, res) => {

    //회원 가입 할떄 필요한 정보들을  client에서 가져오면 
    //그것들을  데이터 베이스에 넣어준다. 
    const user = new User(req.body)

    user.save((err, userInfo) => {
        if (err) return res.json({ success: false, err })
        return res.status(200).json({
            success: true
        })
    })
})



app.post('/login', (req, res) => {
    
    // 요청된 이메일을 데이터베이스에서 있는지 찾는다.
    User.findOne({ email: req.body.email }, (err, user) => {
        if (!user) {
            return res.json({
                loginSuccess: false,
                message: "제공된 이메일에 해당하는 유저가 없습니다."
            })
        }
        
        // 요청된 이메일이 데이터 베이스에 있다면 비밀 번호가 맞는 비밀번호인지 확인.
        user.comparePassword(req.body.password, (err, isMatch) => {
            if (!isMatch)
                return res.json({ loginSuccess: false, message: "비밀번호가 틀렸습니다." })
            
            // 비밀번호까지 맞다면 토큰을 생성하기.
            user.generateToken((err, user) => {
                if (err) return res.status(400).send(err);

                // 토큰을 저장한다. 어디에? 쿠키, 로컬스토리지
                // 어디에 저장해야 하느냐는 논란이 많음(보안문제)
                // 일단 쿠키에 저장하기로함.
                // 아래 라인 실행 되면 크롬 ctrl+shift+j 로 콘솔 열어서 어플리케이션탭 - 쿠키 에 가면 보이게됨.
                res.cookie("x_auth", user.token).status(200).json({ loginSuccess:true,userId:user._id })

            })
        })
    })


    

}) 

app.get('/api/users/auth', auth, (req, res) => {
    // 여기까지 미들웨어를 통과해 왔다는 얘기는 Authentication이 True라는 뜻.
    res.status(200).json({
        _id: req.user._id,
        isAdmin: req.user.role === 0 ? false : true,
        isAuth: true,
        email: req.user.email,
        name: req.user.name,
        lastname: req.user.lastname,
        role: req.user.role,
        image:req.user.image
    })
})



app.listen(port, () => console.log(`Example app Listening on port ${port}!`))

app.get('/api/users/logout', auth, (req, res) => {
    User.findOneAndUpdate({ _id: req.user._id },
        { token: "" },
        (err, user) => {
            if (err) return res.json({ success: false, err });
            return res.status(200).send({
                success: true

            })
        })
})