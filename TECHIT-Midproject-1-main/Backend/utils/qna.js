const fs = require('fs');
const natural = require('natural');

class QNA {
    constructor() {
        this.tokenizer = new natural.SentenceTokenizer();
        this.stopwords = this.loadKoreanStopwords();
        this.reload();
    }

    loadKoreanStopwords() {
        // 한국어 스탑워드 목록을 정의합니다.
        return new Set([
            "의", "가", "이", "은", "들", "는",
            "좀", "잘", "걍", "과", "를", "으로",
            "자", "에", "와", "한", "하다",
        ]);
    }

    reload() {
        const qnaJson = JSON.parse(fs.readFileSync('json/qna.json', 'utf-8'));
        this.questions = qnaJson.qna.map(item => this.cleanText(item.q));
        this.answers = qnaJson.qna.map(item => item.a);

        // TF-IDF 벡터화 및 질문 데이터 학습
        this.vectorizer = new natural.TfIdf();
        this.questions.forEach(question => this.vectorizer.addDocument(question));
    }

    cleanText(text) {
        // 형태소 분석 및 스탑워드 처리
        const words = this.tokenizer.tokenize(text).filter(word => !this.stopwords.has(word));
        return words.join(' ');
    }

    getBestAnswer(userQuestion) {
        // 형태소 분석 및 스탑워드 처리
        const cleanQuestion = this.cleanText(userQuestion);

        // 유사도 계산
        const userQuestionTfidf = new natural.TfIdf();
        userQuestionTfidf.addDocument(cleanQuestion);

        const cosineSimilarities = this.questions.map((question, idx) => {
            return natural.JaroWinklerDistance(cleanQuestion, question);
        });

        // 가장 높은 유사도의 답변 반환
        const bestMatchIdx = cosineSimilarities.indexOf(Math.max(...cosineSimilarities));
        const bestScore = cosineSimilarities[bestMatchIdx];
        return bestScore > 0.05 ? this.answers[bestMatchIdx] : '죄송합니다.<br>이해할 수 없는 질문입니다.';
    }
}

module.exports = { QNA }
